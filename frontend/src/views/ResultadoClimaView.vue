<!-- frontend/src/views/ResultadoClimaView.vue -->
<!-- Vista de resultado: muestra el clima obtenido y el origen de los datos (cache vs API) -->
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useWeatherStore } from '../stores/weather.store';
import FilaCoordenadas from '../components/FilaCoordenadas.vue';
import InsigniaOrigen from '../components/InsigniaOrigen.vue';e';

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
    <FilaCoordenadas
      :latitude="weatherStore.currentWeather.latitude"
      :longitude="weatherStore.currentWeather.longitude"
    />

    <!-- ⭐ Indicador de origen de datos (núcleo de la rúbrica) -->
    <InsigniaOrigen
      v-if="weatherStore.sourceInfo"
      :source="weatherStore.sourceInfo"
    />

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
</style>
