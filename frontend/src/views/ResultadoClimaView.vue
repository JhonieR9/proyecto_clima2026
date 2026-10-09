<!-- frontend/src/views/WeatherResultView.vue -->
<!-- Vista de resultado: muestra el clima obtenido y el origen de los datos (cache vs API) -->
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useWeatherStore } from '../stores/weather.store';

const router = useRouter();
const weatherStore = useWeatherStore();

// Volver al home y limpiar el estado
const goBack = () => {
  weatherStore.clearState();
  router.push({ name: 'home' });
};
</script>

<template>
  <div class="result-card" v-if="weatherStore.currentWeather">

    <!-- Botón volver -->
    <button class="btn-back" @click="goBack" aria-label="Volver al inicio">
      ← Volver
    </button>

    <!-- Ciudad y condición -->
    <div class="weather-header">
      <h2 class="city-name">{{ weatherStore.currentWeather.city }}</h2>
      <p class="condition-text">{{ weatherStore.currentWeather.condition_text }}</p>
    </div>

    <!-- Temperatura principal -->
    <div class="temperature-display" aria-label="Temperatura actual">
      <span class="temp-value">{{ weatherStore.currentWeather.temperature }}</span>
      <span class="temp-unit">°C</span>
    </div>

    <!-- Coordenadas geográficas -->
    <div class="geo-row">
      <div class="geo-chip">
        <span class="geo-label">Latitud</span>
        <span class="geo-value">{{ weatherStore.currentWeather.latitude }}</span>
      </div>
      <div class="geo-chip">
        <span class="geo-label">Longitud</span>
        <span class="geo-value">{{ weatherStore.currentWeather.longitude }}</span>
      </div>
    </div>

    <!-- ⭐ Indicador de origen de datos (núcleo de la rúbrica) -->
    <div
      class="source-badge"
      :class="weatherStore.sourceInfo === 'cache' ? 'source-cache' : 'source-api'"
      role="status"
    >
      <template v-if="weatherStore.sourceInfo === 'cache'">
        <span class="source-icon">📦</span>
        <div class="source-text">
          <strong>Recuperado desde Caché</strong>
          <small>PostgreSQL &mdash; Cero latencia extra</small>
        </div>
      </template>
      <template v-else>
        <span class="source-icon">🌐</span>
        <div class="source-text">
          <strong>Recuperado desde API Externa</strong>
          <small>Open-Meteo &mdash; Dato fresco registrado en BD</small>
        </div>
      </template>
    </div>

  </div>
</template>

<style scoped>
.result-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px 28px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  text-align: center;
  position: relative;
}

/* Botón volver */
.btn-back {
  position: absolute;
  top: 18px;
  left: 18px;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.btn-back:hover {
  background: #f0f4ff;
  color: #1e3c72;
  border-color: #2a5298;
}

/* Encabezado ciudad */
.weather-header {
  margin-top: 30px;
  margin-bottom: 16px;
}

.city-name {
  font-size: 28px;
  font-weight: 700;
  color: #1e3c72;
  margin: 0 0 6px;
}

.condition-text {
  font-size: 16px;
  color: #4a5568;
  font-weight: 500;
  margin: 0;
  text-transform: capitalize;
}

/* Temperatura */
.temperature-display {
  display: inline-flex;
  align-items: flex-start;
  gap: 4px;
  margin: 8px 0 20px;
}

.temp-value {
  font-size: 72px;
  font-weight: 800;
  line-height: 1;
  color: #1a202c;
}

.temp-unit {
  font-size: 28px;
  font-weight: 600;
  color: #718096;
  margin-top: 10px;
}

/* Coordenadas */
.geo-row {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
}

.geo-chip {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.geo-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #a0aec0;
  font-weight: 600;
}

.geo-value {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
}

/* Badge de origen */
.source-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  text-align: left;
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

.source-icon {
  font-size: 26px;
  flex-shrink: 0;
}

.source-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.source-text strong {
  font-size: 14px;
}

.source-text small {
  font-size: 12px;
  opacity: 0.8;
}
</style>
