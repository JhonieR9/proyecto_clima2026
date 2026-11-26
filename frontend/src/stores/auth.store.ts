// frontend/src/stores/auth.store.ts
// ─────────────────────────────────────────────────────────
// Qué hace: Store de autenticación (Pinia). Guarda el access token SOLO en memoria
//           (nunca en localStorage, para mitigar XSS). restoreSession recupera la sesión
//           con la cookie de refresh. clearSession vacía el estado y limpia las favoritas.
// Conectado con: auth.service.ts, ClimaLayout.vue, router/index.ts,
//               LoginView.vue, RegistroView.vue, main.ts.
// Rol: Única fuente de verdad sobre si el usuario está autenticado y quién es.
import { defineStore } from 'pinia';
import { AuthService, type AuthUser } from '../services/auth.service';

/**
 * Estado del store de autenticación.
 * accessToken solo vive en memoria (no se persiste) para mitigar XSS:
 * si un atacante inyecta JS, no puede robar el token desde localStorage.
 */
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
    /**
     * Indica si hay una sesión activa.
     * El router lo usa como condición de los guards requiresAuth y guestOnly.
     */
    // ¿Hay una sesión activa? (token en memoria)
    isAuthenticated: (state): boolean => state.accessToken !== null,

    /**
     * Rol del usuario autenticado. Permite que la UI muestre/oculte opciones
     * según el rol (ej. panel de administración).
     */
    // Rol del usuario autenticado (para control de acceso por rol en el frontend)
    role: (state): string | null => state.user?.role ?? null,
  },

  actions: {
    /**
     * Guarda el access token y los datos del usuario en memoria.
     * También lo llama el interceptor de Axios cuando renueva el token.
     */
    // Guarda el par (token + usuario) devuelto por el backend.
    setSession(accessToken: string, user: AuthUser) {
      this.accessToken = accessToken;
      this.user = user;
    },

    /**
     * Limpia el estado de sesión de este store y también las favoritas del store
     * correspondiente, para que las ciudades del usuario anterior no aparezcan
     * si otra persona inicia sesión en la misma pestaña.
     * El import dinámico evita la dependencia circular entre stores en tiempo de carga.
     */
    // Limpia la sesión en memoria (y las favoritas del usuario saliente).
    clearSession() {
      this.accessToken = null;
      this.user = null;
      // Import dinámico para evitar dependencia circular entre stores.
      import('./favorite.store').then(({ useFavoriteStore }) => {
        useFavoriteStore().clear();
      });
    },

    /**
     * Registra un nuevo usuario.
     * No inicia sesión automáticamente; delega al backend solo la creación.
     * Guarda el error en el store para que la vista lo muestre.
     *
     * @throws Re-lanza el error para que la vista pueda detener el flujo si quiere.
     */
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

    /**
     * Inicia sesión: llama al backend, guarda el access token en memoria y los datos del usuario.
     * El refresh token queda en la cookie HttpOnly gestionada por el navegador.
     *
     * @throws Re-lanza el error para que la vista pueda manejar el flujo (ej. no redirigir).
     */
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

    /**
     * Renueva el access token usando la cookie de refresh.
     * Lo llama el interceptor de Axios ante cualquier respuesta 401,
     * de forma transparente para los servicios.
     *
     * @returns El nuevo access token (para que el interceptor lo adjunte en el reintento)
     */
    // Renueva el access token usando la cookie de refresh (rotación en backend).
    // Lo usa el interceptor de Axios ante un 401.
    async refresh(): Promise<string> {
      const { accessToken, user } = await AuthService.refresh();
      this.setSession(accessToken, user);
      return accessToken;
    },

    /**
     * Cierra la sesión: revoca el refresh token en el backend y limpia el estado local.
     * El try/finally garantiza que el estado local se limpie aunque la petición falle
     * (ej. si el servidor está caído, el usuario igualmente sale de la app).
     */
    // Logout: revoca el refresh en el backend y limpia el estado local.
    async logout() {
      try {
        await AuthService.logout();
      } finally {
        this.clearSession();
      }
    },

    /**
     * Intenta rehidratar la sesión al arrancar la app.
     * Si existe una cookie de refresh válida, el backend emite un nuevo access token.
     * Lo llama main.ts antes de montar la app para que el router vea el estado correcto.
     *
     * @returns true si la sesión se recuperó, false si no había cookie o era inválida.
     */
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
