// frontend/src/services/auth.service.ts
// Servicio de AUTENTICACIÓN tipado (cero 'any'). Traduce las respuestas del
// backend ({ success, data }) a tipos estrictos que consume el store.
import { AxiosError } from 'axios';
import { http } from './http';

// Usuario tal como lo devuelve el backend (sin password).
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

// Contrato de la respuesta de login / refresh.
interface SessionData {
  accessToken: string;
  user: AuthUser;
}

// Envoltura estándar de las respuestas del backend.
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const AuthService = {
  // POST /api/auth/register  -> crea el usuario (no inicia sesión).
  async register(payload: { name: string; email: string; password: string }): Promise<AuthUser> {
    const { data } = await http.post<ApiEnvelope<AuthUser>>('/api/auth/register', payload);
    return data.data;
  },

  // POST /api/auth/login  -> accessToken (memoria) + cookie HttpOnly con refresh.
  async login(payload: { email: string; password: string }): Promise<SessionData> {
    const { data } = await http.post<ApiEnvelope<SessionData>>('/api/auth/login', payload);
    return data.data;
  },

  // POST /api/auth/refresh  -> rota el refresh y entrega un nuevo access token.
  async refresh(): Promise<SessionData> {
    const { data } = await http.post<ApiEnvelope<SessionData>>('/api/auth/refresh');
    return data.data;
  },

  // POST /api/auth/logout  -> revoca el refresh token actual.
  async logout(): Promise<void> {
    await http.post('/api/auth/logout');
  },

  // GET /api/auth/me  -> datos del usuario autenticado (requiere Bearer).
  async me(): Promise<AuthUser> {
    const { data } = await http.get<ApiEnvelope<AuthUser>>('/api/auth/me');
    return data.data;
  },

  // Normaliza el mensaje de error del backend para mostrarlo en la UI.
  extractError(err: unknown, fallback: string): string {
    if (err instanceof AxiosError) {
      const body = err.response?.data as { error?: string; message?: string } | undefined;
      return body?.error ?? body?.message ?? fallback;
    }
    return fallback;
  },
};
