// frontend/src/services/auth.service.ts
// ─────────────────────────────────────────────────────────
// Qué hace: Servicio de autenticación tipado. Llama a /register, /login, /refresh,
//           /logout y /me usando la instancia http. Desenvuelve el sobre {success,data}
//           del backend. extractError normaliza el error a un string legible para la UI.
// Conectado con: http.ts (instancia Axios con interceptores), auth.store.ts.
// Rol: Capa de comunicación con la API de autenticación. Separa HTTP del estado (store).
import { AxiosError } from 'axios';
import { http } from './http';

/**
 * Usuario tal como lo devuelve el backend (sin el campo password).
 * El campo created_at es opcional porque no siempre lo incluye el backend
 * en la respuesta de login (que prioriza velocidad).
 */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

/**
 * Datos devueltos por los endpoints de sesión (login y refresh).
 * El accessToken se guarda en memoria del store; el refreshToken viaja en cookie.
 */
interface SessionData {
  accessToken: string;
  user: AuthUser;
}

/**
 * Envoltura estándar de las respuestas del backend { success: true, data: T }.
 * Usamos el genérico T para que cada método declare exactamente qué espera recibir.
 */
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const AuthService = {
  /**
   * Registra un nuevo usuario en el sistema.
   * No inicia sesión automáticamente; el flujo espera que el usuario vaya al login.
   *
   * @param payload  Datos del nuevo usuario
   * @returns        El usuario creado (sin contraseña)
   */
  // POST /api/auth/register  -> crea el usuario (no inicia sesión).
  async register(payload: { name: string; email: string; password: string }): Promise<AuthUser> {
    const { data } = await http.post<ApiEnvelope<AuthUser>>('/api/auth/register', payload);
    return data.data;
  },

  /**
   * Inicia sesión. El backend responde con el accessToken en el body y pone
   * el refreshToken en una cookie HttpOnly (el navegador la gestiona automáticamente).
   *
   * @param payload  Credenciales del usuario
   * @returns        Access token (para guardar en memoria) y datos del usuario
   */
  // POST /api/auth/login  -> accessToken (memoria) + cookie HttpOnly con refresh.
  async login(payload: { email: string; password: string }): Promise<SessionData> {
    const { data } = await http.post<ApiEnvelope<SessionData>>('/api/auth/login', payload);
    return data.data;
  },

  /**
   * Rota el refresh token. El navegador envía la cookie automáticamente y el backend
   * devuelve un nuevo par (access + refresh). El nuevo refresh vuelve en cookie.
   * Lo llama el interceptor de Axios ante cualquier 401.
   *
   * @returns  Nuevo access token y datos actualizados del usuario
   */
  // POST /api/auth/refresh  -> rota el refresh y entrega un nuevo access token.
  async refresh(): Promise<SessionData> {
    const { data } = await http.post<ApiEnvelope<SessionData>>('/api/auth/refresh');
    return data.data;
  },

  /**
   * Revoca el refresh token en el backend.
   * El interceptor de Axios no reintentará el logout automáticamente
   * porque su URL está en la lista isAuthRoute.
   */
  // POST /api/auth/logout  -> revoca el refresh token actual.
  async logout(): Promise<void> {
    await http.post('/api/auth/logout');
  },

  /**
   * Devuelve los datos del usuario autenticado leyéndolos de la BD.
   * Se usa tras rehidratar la sesión para obtener datos actualizados (ej. nuevo rol).
   * Requiere que el interceptor de petición haya adjuntado el Bearer token.
   */
  // GET /api/auth/me  -> datos del usuario autenticado (requiere Bearer).
  async me(): Promise<AuthUser> {
    const { data } = await http.get<ApiEnvelope<AuthUser>>('/api/auth/me');
    return data.data;
  },

  /**
   * Extrae el mensaje de error de una respuesta del backend y lo convierte
   * en un string legible para mostrarlo en la UI.
   * El backend devuelve { error: { code, message } }, pero toleramos también
   * formatos de error planos por compatibilidad.
   *
   * @param err      Error capturado en el bloque catch
   * @param fallback Mensaje por defecto si no se puede extraer uno del error
   */
  // Normaliza el mensaje de error del backend para mostrarlo en la UI.
  // El backend responde { error: { code, message } }, pero toleramos también
  // formatos antiguos donde `error` fuese un string plano.
  extractError(err: unknown, fallback: string): string {
    if (err instanceof AxiosError) {
      const body = err.response?.data as
        | { error?: { message?: string } | string; message?: string }
        | undefined;
      if (body) {
        if (typeof body.error === 'string') return body.error;
        if (body.error?.message) return body.error.message;
        if (body.message) return body.message;
      }
    }
    return fallback;
  },
};
