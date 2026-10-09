<!-- frontend/src/views/HomeView.vue -->
<!-- Vista principal: buscador de clima con indicador de origen de datos -->
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useWeatherStore } from '../stores/weather.store';

const router = useRouter();
const weatherStore = useWeatherStore();

const cityInput = ref('');

// Ejecuta la búsqueda y redirige a la vista de resultados
const handleSearch = async () => {
  const city = cityInput.value.trim();
  if (!city) return;

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

    <!-- Buscador -->
    <div class="search-box">
      <input
        v-model="cityInput"
        type="text"
        placeholder="Escribe una ciudad (ej: Bogota, Cali)..."
        aria-label="Nombre de la ciudad"
        @keyup.enter="handleSearch"
      />
      <button :disabled="weatherStore.loading" @click="handleSearch">
        {{ weatherStore.loading ? 'Buscando...' : 'Buscar' }}
      </button>
    </div>

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
  background: #ffffff;
  border-radius: 16px;
  padding: 36px 32px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  text-align: center;
}

/* Encabezado */
.home-header {
  margin-bottom: 28px;
}

.home-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e3c72;
  margin: 0 0 6px;
}

.home-subtitle {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0;
}

/* Buscador */
.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

input {
  flex: 1;
  padding: 12px 14px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.25s;
  color: #333;
}

input:focus {
  border-color: #2a5298;
}

button {
  padding: 12px 18px;
  background: #2a5298;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.25s;
}

button:hover:not(:disabled) {
  background: #1e3c72;
}

button:disabled {
  background: #9ab;
  cursor: not-allowed;
}

/* Loading */
.loading-state {
  margin: 20px 0;
  color: #666;
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
  color: #aaa;
  font-size: 13px;
  margin-top: 8px;
}
</style>
