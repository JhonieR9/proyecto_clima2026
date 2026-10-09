// frontend/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useWeatherStore } from '../stores/weather.store';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/BuscadorView.vue'),
  },
  {
    path: '/result',
    name: 'weather-result',
    component: () => import('../views/ResultadoClimaView.vue'),
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

export default router;
