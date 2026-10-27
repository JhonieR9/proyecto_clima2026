<!-- frontend/src/views/BuscadorView.vue -->
<!-- Vista principal: buscador de clima con indicador de origen de datos -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWeatherStore } from '../stores/weather.store';
import { useFavoriteStore } from '../stores/favorite.store';
import CajaBusqueda from '../components/CajaBusqueda.vue';

const router = useRouter();
const weatherStore = useWeatherStore();
const favoriteStore = useFavoriteStore();

// Carga las favoritas del usuario al entrar.
onMounted(() => {
  favoriteStore.load().catch(() => {
    /* si falla (p. ej. sin sesión), simplemente no se muestran */
  });
});

// Ejecuta la búsqueda y redirige a la vista de resultados.
const handleSearch = async (city: string) => {
  await weatherStore.searchCityWeather(city);
  if (weatherStore.currentWeather) {
    router.push({ name: 'weather-result' });
  }
};

// Consultar el clima de una favorita (un clic, sin volver a escribir).
const openFavorite = (city: string) => {
  handleSearch(city);
};

// Quitar una favorita.
const removeFavorite = async (id: number) => {
  try {
    await favoriteStore.remove(id);
  } catch {
    /* noop */
  }
};
</script>

<template>
  <div class="home-card">

    <!-- Encabezado -->
    <div class="home-header">
      <h1 class="home-title">Consultoría Meteorológica 🌤️</h1>
      <p class="home-subtitle">Proyecto de Grado &mdash; Sistema de Caching con PostgreSQL</p>
    </div>

    <!-- Buscador (componente reutilizable) -->
    <CajaBusqueda :loading="weatherStore.loading" @search="handleSearch" />

    <!-- Spinner de carga -->
    <div v-if="weatherStore.loading" class="loading-state" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <p>Consultando datos meteorológicos...</p>
    </div>

    <!-- Error -->
    <div v-if="weatherStore.error && !weatherStore.loading" class="error-badge" role="alert">
      ❌ {{ weatherStore.error }}
    </div>

    <!-- ===== Favoritas del usuario ===== -->
    <div v-if="favoriteStore.items.length > 0" class="favorites">
      <p class="favorites-title">⭐ Tus ciudades favoritas</p>
      <ul class="favorites-list">
        <li v-for="fav in favoriteStore.items" :key="fav.id" class="fav-chip">
          <button class="fav-open" @click="openFavorite(fav.city)" :title="`Ver clima de ${fav.city}`">
            {{ fav.city }}
          </button>
          <button class="fav-remove" @click="removeFavorite(fav.id)" :aria-label="`Quitar ${fav.city}`">
            ×
          </button>
        </li>
      </ul>
    </div>

    <!-- Sugerencia cuando no hay búsqueda ni favoritas aún -->
    <p
      v-if="!weatherStore.loading && !weatherStore.error && favoriteStore.items.length === 0"
      class="hint"
    >
      Busca una ciudad para ver su clima y agrégala a favoritas.
    </p>

  </div>
</template>

<style scoped>
.home-card {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  padding: 36px 32px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  text-align: center;
  color: #fff;
}

/* Encabezado */
.home-header {
  margin-bottom: 28px;
}

.home-title {
  font-size: 23px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 6px;
}

.home-subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0;
}

/* Loading */
.loading-state {
  margin: 20px 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.spinner {
  width: 38px;
  height: 38px;
  border: 4px solid #e2e8f0;
  border-top-color: #2a5298;
  border-radius: 50%;
  margin: 0 auto 10px;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error */
.error-badge {
  background: #fff0f0;
  color: #c62828;
  border: 1px solid #ffcdd2;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 14px;
  margin-top: 4px;
}

/* Hint */
.hint {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  margin-top: 8px;
}

/* ===== Favoritas ===== */
.favorites {
  margin-top: 18px;
  text-align: left;
}

.favorites-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 10px;
  text-align: center;
}

.favorites-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.fav-chip {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  overflow: hidden;
}

.fav-open {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 10px 7px 14px;
  cursor: pointer;
}

.fav-open:hover {
  text-decoration: underline;
}

.fav-remove {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  line-height: 1;
  padding: 0 10px 0 4px;
  cursor: pointer;
}

.fav-remove:hover {
  color: #fff;
}
</style>
