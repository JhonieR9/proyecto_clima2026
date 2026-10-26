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
//  - _retry: marca el (único) reintento tras refrescar el token por un 401.
//  - _retryCount: nº de reintentos automáticos ya hechos ante red/5xx/429.
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

// --- Configuración de reintentos automáticos ---
// CORE: "Axios ... con reintentos automáticos". Reintentamos ante fallos
// transitorios (sin respuesta del servidor, 5xx, o 429) usando backoff
// exponencial. Solo métodos idempotentes para no repetir efectos secundarios.
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 300; // 300ms, 600ms, 1200ms...
const IDEMPOTENT_METHODS = ['get', 'head', 'options'];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ¿Este error es transitorio y vale la pena reintentarlo?
function isRetriableError(error: AxiosError, config: RetriableConfig): boolean {
  const method = (config.method ?? 'get').toLowerCase();
  if (!IDEMPOTENT_METHODS.includes(method)) return false;

  // Sin respuesta => error de red o timeout: reintentar.
  if (!error.response) return true;

  // 5xx (servidor) o 429 (rate limit): reintentar.
  const status = error.response.status;
  return status >= 500 || status === 429;
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

    // --- Reintentos automáticos ante fallos transitorios (red / 5xx / 429) ---
    // Se aplica antes del manejo de 401. Usa backoff exponencial y respeta
    // el header Retry-After si el servidor lo envía (típico en 429).
    if (original && isRetriableError(error, original)) {
      const attempt = (original._retryCount ?? 0) + 1;
      if (attempt <= MAX_RETRIES) {
        original._retryCount = attempt;

        const retryAfter = Number(error.response?.headers?.['retry-after']);
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);

        await delay(wait);
        return http(original);
      }
    }

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
