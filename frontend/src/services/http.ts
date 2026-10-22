// frontend/src/services/http.ts
// Instancia central de Axios. CORE: "Axios tipado con interceptores y
// reintentos automáticos". Añade el Access Token (memoria) a cada petición y,
// ante un 401, intenta rotar el refresh token una vez y reintenta la petición.
import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

// Base del backend Express.
export const API_BASE_URL = 'http://localhost:3000';

// Instancia compartida. withCredentials => envía/recibe la cookie HttpOnly
// del refresh token en las rutas que la necesitan.
export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
});

// Marca interna para no reintentar infinitamente una misma petición.
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// --- Rotura de dependencia circular ---
// El store importa este módulo (vía auth.service) y aquí necesitamos el store.
// Para evitar el ciclo en tiempo de carga, inyectamos "proveedores" perezosos
// que el arranque de la app registra una sola vez.
type TokenProvider = () => string | null;
type RefreshFn = () => Promise<string>;
type LogoutFn = () => void;

let getToken: TokenProvider = () => null;
let doRefresh: RefreshFn = async () => {
  throw new Error('refresh no inicializado');
};
let doLogout: LogoutFn = () => {};

export function configureHttpAuth(providers: {
  getToken: TokenProvider;
  refresh: RefreshFn;
  onLogout: LogoutFn;
}) {
  getToken = providers.getToken;
  doRefresh = providers.refresh;
  doLogout = providers.onLogout;
}

// --- Interceptor de PETICIÓN: adjunta el Bearer si hay token en memoria ---
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// --- Control de refresh concurrente ---
// Si varias peticiones reciben 401 a la vez, solo disparamos UN refresh y las
// demás esperan la misma promesa.
let refreshing: Promise<string> | null = null;

// --- Interceptor de RESPUESTA: reintento automático tras refrescar el token ---
http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    // No intentamos refrescar para las propias rutas de sesión (evita bucles).
    const isAuthRoute =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/refresh') ||
      url.includes('/api/auth/register');

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = doRefresh().finally(() => {
            refreshing = null;
          });
        }
        const newToken = await refreshing;
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return http(original); // reintento de la petición original
      } catch (refreshErr) {
        // El refresh falló => sesión no recuperable: limpiamos y propagamos.
        doLogout();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default http;
