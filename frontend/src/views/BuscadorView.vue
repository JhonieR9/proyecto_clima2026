<!-- frontend/src/views/BuscadorView.vue -->
<!-- Vista principal: buscador de clima con indicador de origen de datos -->
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useWeatherStore } from '../stores/weather.store';
import CajaBusqueda from '../components/CajaBusqueda.vue';

const router = useRouter();
const weatherStore = useWeatherStore();

// Ejecuta la búsqueda y redirige a la vista de resultados
const handleSearch = async (city: string) => {
  await weatherStore.searchCityWeather(city);

  // Solo navegar si la búsqueda fue exitosa
  if (weatherStore.currentWeather) {
    router.push({ name: 'weather-result' });
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

    <!-- Sugerencia cuando no hay búsqueda aún -->
    <p v-if="!weatherStore.currentWeather && !weatherStore.loading && !weatherStore.error" class="hint">
      Ingresa el nombre de una ciudad para ver su clima actual.
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
</style>
