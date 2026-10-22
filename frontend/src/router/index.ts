// frontend/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useWeatherStore } from '../stores/weather.store';
import { useAuthStore } from '../stores/auth.store';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/RegistroView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('../views/BuscadorView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/result',
    name: 'weather-result',
    component: () => import('../views/ResultadoClimaView.vue'),
    meta: { requiresAuth: true },
    // Navigation Guard: solo permite entrar si hay datos en el store
    beforeEnter: (_to, _from, next) => {
      const store = useWeatherStore();
      if (!store.currentWeather) {
        next({ name: 'home' });
      } else {
        next();
      }
    },
  },
  {
    // Captura cualquier ruta no definida → 404
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/PaginaNoEncontradaView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation Guard global ASÍNCRONO para control de acceso.
// CORE: "Navigation Guards asíncronos para control de acceso".
router.beforeEach(async (to) => {
  const auth = useAuthStore();

  // Si aún no hay sesión en memoria, intenta rehidratar desde la cookie
  // de refresh (p. ej. tras un refresco de página) antes de decidir.
  if (!auth.isAuthenticated) {
    await auth.restoreSession();
  }

  // Rutas protegidas: exigen sesión activa.
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // Rutas solo para invitados (login/registro): si ya hay sesión, al inicio.
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'home' };
  }

  return true;
});

export default router;
