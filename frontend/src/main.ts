// frontend/src/main.ts
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
