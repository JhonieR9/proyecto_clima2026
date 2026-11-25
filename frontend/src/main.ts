// frontend/src/main.ts
// ─────────────────────────────────────────────────────────
// Qué hace: Archivo de arranque del frontend. Crea la app Vue, instala Pinia y el router.
//           Conecta el interceptor de Axios con el store de auth (configureHttpAuth)
//           para evitar la dependencia circular. Recupera la sesión antes de montar.
// Conectado con: App.vue, router/index.ts, style.css, http.ts (configureHttpAuth), auth.store.ts.
// Rol: Punto de entrada del frontend. Ensambla todas las piezas y monta la app en el DOM.
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';
import { configureHttpAuth } from './services/http';
import { useAuthStore } from './stores/auth.store';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Conecta el interceptor de Axios con el store de auth (token en memoria,
// refresh rotativo y logout), evitando la dependencia circular en la carga.
const authStore = useAuthStore(pinia);
configureHttpAuth({
  getToken: () => authStore.accessToken,
  refresh: () => authStore.refresh(),
  onLogout: () => authStore.clearSession(),
});

// Intenta rehidratar la sesión (cookie de refresh) antes de montar la app.
authStore.restoreSession().finally(() => {
  app.mount('#app');
});
