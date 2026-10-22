// frontend/src/stores/auth.store.ts
// Store de AUTENTICACIÓN. CORE: "Access Token EN MEMORIA y Refresh Token
// rotativo en cookie HttpOnly". El accessToken vive solo aquí (state de Pinia),
// nunca en localStorage/sessionStorage, para mitigar robo por XSS.
import { defineStore } from 'pinia';
import { AuthService, type AuthUser } from '../services/auth.service';

interface AuthState {
  accessToken: string | null; // SOLO en memoria
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    user: null,
    loading: false,
    error: null,
  }),

  getters: {
    // ¿Hay una sesión activa? (token en memoria)
    isAuthenticated: (state): boolean => state.accessToken !== null,
    // Rol del usuario autenticado (para control de acceso por rol en el frontend)
    role: (state): string | null => state.user?.role ?? null,
  },

  actions: {
    // Guarda el par (token + usuario) devuelto por el backend.
    setSession(accessToken: string, user: AuthUser) {
      this.accessToken = accessToken;
      this.user = user;
    },

    // Limpia la sesión en memoria.
    clearSession() {
      this.accessToken = null;
      this.user = null;
    },

    // Registro de un nuevo usuario. No inicia sesión automáticamente:
    // el backend crea el usuario y devolvemos el control a la vista.
    async register(payload: { name: string; email: string; password: string }) {
      this.loading = true;
      this.error = null;
      try {
        await AuthService.register(payload);
      } catch (err: unknown) {
        this.error = AuthService.extractError(err, 'No se pudo completar el registro.');
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Login: obtiene accessToken (memoria) + setea cookie HttpOnly con el refresh.
    async login(payload: { email: string; password: string }) {
      this.loading = true;
      this.error = null;
      try {
        const { accessToken, user } = await AuthService.login(payload);
        this.setSession(accessToken, user);
      } catch (err: unknown) {
        this.error = AuthService.extractError(err, 'Credenciales inválidas.');
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Renueva el access token usando la cookie de refresh (rotación en backend).
    // Lo usa el interceptor de Axios ante un 401.
    async refresh(): Promise<string> {
      const { accessToken, user } = await AuthService.refresh();
      this.setSession(accessToken, user);
      return accessToken;
    },

    // Logout: revoca el refresh en el backend y limpia el estado local.
    async logout() {
      try {
        await AuthService.logout();
      } finally {
        this.clearSession();
      }
    },

    // Rehidrata la sesión al cargar la app: si existe cookie de refresh válida,
    // obtenemos un access token nuevo y los datos del usuario.
    async restoreSession(): Promise<boolean> {
      try {
        await this.refresh();
        return true;
      } catch {
        this.clearSession();
        return false;
      }
    },
  },
});
