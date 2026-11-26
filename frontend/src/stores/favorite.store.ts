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

/** Estado del store de favoritas. */
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
    /**
     * Verifica si una ciudad ya está en las favoritas del usuario actual.
     * La comparación normaliza el nombre (trim + toLowerCase) para que
     * "Bogotá" y "bogota" se consideren la misma ciudad.
     * Se usa en ResultadoClimaView para mostrar la estrella llena o vacía.
     */
    // ¿La ciudad (por nombre normalizado) ya está en favoritas?
    isFavorite: (state) => (city: string) => {
      const key = city.trim().toLowerCase();
      return state.items.some((f) => f.city.trim().toLowerCase() === key);
    },
  },

  actions: {
    /**
     * Carga las favoritas del usuario desde el backend.
     * Se llama en BuscadorView al montar, para que las estrellas muestren
     * el estado correcto sin necesidad de que el usuario haga clic.
     */
    async load() {
      this.loading = true;
      try {
        this.items = await FavoriteService.list();
      } finally {
        this.loading = false;
      }
    },

    /**
     * Agrega una ciudad a favoritas y la inserta al inicio de la lista local.
     * Verifica por id que no exista ya para evitar duplicados en el estado
     * (aunque el backend lo garantice con ON CONFLICT, puede haber race conditions
     * si el usuario hace clic muy rápido).
     */
    async add(city: string, latitude?: number, longitude?: number) {
      const fav = await FavoriteService.add({ city, latitude, longitude });
      // Evita duplicados en el estado local.
      const exists = this.items.some((f) => f.id === fav.id);
      if (!exists) this.items.unshift(fav);
    },

    /**
     * Elimina una favorita del backend y la filtra fuera de la lista local.
     * Actualiza el estado local sin necesidad de recargar toda la lista.
     */
    async remove(id: number) {
      await FavoriteService.remove(id);
      this.items = this.items.filter((f) => f.id !== id);
    },

    /**
     * Vacía la lista local de favoritas.
     * Se llama desde auth.store.clearSession() al cerrar sesión para que
     * las favoritas del usuario anterior no queden visibles en la UI.
     */
    clear() {
      this.items = [];
    },
  },
});
