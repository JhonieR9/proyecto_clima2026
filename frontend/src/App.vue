<!-- frontend/src/App.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useWeatherStore } from './stores/weather.store';

// Estado local para el input del buscador
const cityInput = ref('');

// Instanciamos la tienda de Pinia
const weatherStore = useWeatherStore();

// Función para disparar la búsqueda
const handleSearch = async () => {
  if (!cityInput.value.trim()) return;
  await weatherStore.searchCityWeather(cityInput.value);
};
</script>

<template>
  <div class="app-container">
    <div class="weather-card">
      <h1>Consultoría Meteorológica 🌤️</h1>
      <p class="subtitle">Proyecto de Grado - Sistema de Caching Postgres</p>

      <!-- Buscador -->
      <div class="search-box">
        <input 
          v-model="cityInput" 
          type="text" 
          placeholder="Escribe una ciudad (ej: Bogota, Cali)..." 
          @keyup.enter="handleSearch"
        />
        <button :disabled="weatherStore.loading" @click="handleSearch">
          {{ weatherStore.loading ? 'Buscando...' : 'Buscar' }}
        </button>
      </div>

      <!-- Estado de Carga -->
      <div v-if="weatherStore.loading" class="loading-state">
        <div class="spinner"></div>
        <p>Consultando datos meteorológicos...</p>
      </div>

      <!-- Mensaje de Error -->
      <div v-if="weatherStore.error" class="error-badge">
        ❌ {{ weatherStore.error }}
      </div>

      <!-- Panel de Resultados -->
      <div v-if="weatherStore.currentWeather && !weatherStore.loading" class="results-panel">
        <div class="weather-main">
          <h2>{{ weatherStore.currentWeather.city }}</h2>
          <p class="temperature">{{ weatherStore.currentWeather.temperature }}°C</p>
          <p class="condition">{{ weatherStore.currentWeather.condition_text }}</p>
        </div>

        <div class="geo-info">
          <span>Lat: {{ weatherStore.currentWeather.latitude }}</span>
          <span>Lon: {{ weatherStore.currentWeather.longitude }}</span>
        </div>

        <!-- Indicador de Origen de Datos (Core de la Rúbrica) -->
        <div 
          class="source-badge" 
          :class="weatherStore.sourceInfo === 'cache' ? 'source-cache' : 'source-api'"
        >
          <span v-if="weatherStore.sourceInfo === 'cache'">
            📦 Recuperado desde: <strong>Caché (PostgreSQL)</strong> - Cero Latencia
          </span>
          <span v-else>
            🌐 Recuperado desde: <strong>API Externa (Open-Meteo)</strong> - Registro Fresco
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
  padding: 20px;
}

.weather-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 30px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
  text-align: center;
}

h1 {
  font-size: 24px;
  margin-bottom: 5px;
  color: #1e3c72;
}

.subtitle {
  font-size: 12px;
  color: #666;
  margin-bottom: 25px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

input {
  flex: 1;
  padding: 12px 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.3s;
}

input:focus {
  border-color: #2a5298;
}

button {
  padding: 12px 20px;
  background: #2a5298;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.3s;
}

button:hover {
  background: #1e3c72;
}

button:disabled {
  background: #999;
  cursor: not-allowed;
}

.loading-state {
  margin: 20px 0;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2a5298;
  border-radius: 50%;
  margin: 0 auto 10px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-badge {
  background: #ffebee;
  color: #c62828;
  padding: 12px;
  border-radius: 8px;
  margin: 15px 0;
  font-size: 14px;
}

.results-panel {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
}

.temperature {
  font-size: 48px;
  font-weight: bold;
  color: #1a202c;
  margin: 10px 0;
}

.condition {
  font-size: 18px;
  color: #4a5568;
  font-weight: 500;
}

.geo-info {
  display: flex;
  justify-content: center;
  gap: 15px;
  font-size: 12px;
  color: #718096;
  margin-top: 10px;
}

.source-badge {
  margin-top: 20px;
  padding: 10px;
  border-radius: 6px;
  font-size: 13px;
}

.source-cache {
  background: #e6fffa;
  color: #00695c;
  border: 1px solid #b2dfdb;
}

.source-api {
  background: #eef2ff;
  color: #283593;
  border: 1px solid #c5cae9;
}
</style>
