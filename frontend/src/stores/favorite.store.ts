// frontend/src/stores/favorite.store.ts
// ─────────────────────────────────────────────────────────
// Qué hace: Store de favoritas (Pinia). Mantiene la lista del usuario actual.
//           isFavorite(city) permite saber si una ciudad ya está marcada.
//           clear() se llama al cerrar sesión para evitar que las favoritas de un usuario
//           aparezcan al siguiente.
// Conectado con: favorite.service.ts, BuscadorView.vue, ResultadoClimaView.vue.
// Rol: Estado de las favoritas del usuario actual. Separa persistencia de presentación.
import { defineStore } from 'pinia';
import { FavoriteService, type Favorite } from '../services/favorite.service';

interface FavoriteState {
  items: Favorite[];
  loading: boolean;
}

export const useFavoriteStore = defineStore('favorite', {
  state: (): FavoriteState => ({
    items: [],
    loading: false,
  }),

  getters: {
    // ¿La ciudad (por nombre normalizado) ya está en favoritas?
    isFavorite: (state) => (city: string) => {
      const key = city.trim().toLowerCase();
      return state.items.some((f) => f.city.trim().toLowerCase() === key);
    },
  },

  actions: {
    async load() {
      this.loading = true;
      try {
        this.items = await FavoriteService.list();
      } finally {
        this.loading = false;
      }
    },

    async add(city: string, latitude?: number, longitude?: number) {
      const fav = await FavoriteService.add({ city, latitude, longitude });
      // Evita duplicados en el estado local.
      const exists = this.items.some((f) => f.id === fav.id);
      if (!exists) this.items.unshift(fav);
    },

    async remove(id: number) {
      await FavoriteService.remove(id);
      this.items = this.items.filter((f) => f.id !== id);
    },

    clear() {
      this.items = [];
    },
  },
});
