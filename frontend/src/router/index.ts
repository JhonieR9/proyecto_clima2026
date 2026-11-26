// frontend/src/router/index.ts
// ─────────────────────────────────────────────────────────
// Qué hace: Define las rutas y el control de acceso. /login y /register son solo para
//           invitados. / y /result requieren sesión. /result además exige datos en el store.
//           El guard global es asíncrono e intenta recuperar la sesión antes de decidir.
// Conectado con: weather.store.ts (guard de /result), auth.store.ts (guard global), main.ts.
// Rol: Control de acceso del frontend. Solo protege la interfaz; los datos los protege el backend.
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useWeatherStore } from '../stores/weather.store';
import { useAuthStore } from '../stores/auth.store';

/**
 * Definición de rutas de la aplicación.
 * Se usan imports dinámicos (lazy loading) para que Vite haga code splitting:
 * cada vista se carga solo cuando el usuario navega a ella.
 *
 * meta.requiresAuth: la ruta exige sesión activa.
 * meta.guestOnly:    la ruta es solo para usuarios no autenticados.
 */
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
    // Guard de ruta: evita que el usuario llegue a /result sin haber consultado antes.
    // Si currentWeather es null (p. ej. el usuario escribe /result directamente
    // en la barra de direcciones), lo manda al buscador.
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

/**
 * Guard global asíncrono de control de acceso.
 * Se ejecuta antes de cada navegación. Es asíncrono porque necesita intentar
 * rehidratar la sesión (llamar al backend) antes de decidir si redirigir.
 *
 * Lógica:
 *   1. Si no hay sesión en memoria, intenta recuperarla vía cookie de refresh.
 *      (Esto sucede tras un refresco de página, donde Pinia se reinicia.)
 *   2. Si la ruta requiere auth y no hay sesión: redirige al login con `redirect`
 *      para volver a la misma ruta tras iniciar sesión.
 *   3. Si la ruta es guestOnly y ya hay sesión: redirige al inicio
 *      (el usuario logueado no tiene por qué ver el login/registro).
 */
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
