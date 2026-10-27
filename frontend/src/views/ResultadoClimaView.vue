<!-- frontend/src/views/ResultadoClimaView.vue -->
<!-- Vista de resultado: tarjeta de clima con ícono animado y fondo que cambia
     según la condición (soleado, lluvia, nublado, nieve, tormenta, niebla). -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useWeatherStore } from '../stores/weather.store';
import { useFavoriteStore } from '../stores/favorite.store';
import FilaCoordenadas from '../components/FilaCoordenadas.vue';
import InsigniaOrigen from '../components/InsigniaOrigen.vue';
import WeatherIcon from '../components/WeatherIcon.vue';
import { themeFromCondition } from '../utils/weatherTheme';

const router = useRouter();
const weatherStore = useWeatherStore();
const favoriteStore = useFavoriteStore();

// Tema (gradiente + tipo de ícono) derivado de la condición del clima.
const theme = computed(() =>
  themeFromCondition(weatherStore.currentWeather?.condition_text ?? '')
);

// Redondea la temperatura para mostrarla grande y limpia.
const temp = computed(() =>
  Math.round(Number(weatherStore.currentWeather?.temperature ?? 0))
);

// ¿La ciudad actual ya es favorita?
const isFav = computed(() =>
  weatherStore.currentWeather
    ? favoriteStore.isFavorite(weatherStore.currentWeather.city)
    : false
);

const savingFav = ref(false);

// Asegura tener la lista de favoritas para saber el estado de la estrella.
onMounted(() => {
  if (favoriteStore.items.length === 0) {
    favoriteStore.load().catch(() => {});
  }
});

// Alterna favorita: si no está, la agrega; si está, la quita.
const toggleFavorite = async () => {
  const w = weatherStore.currentWeather;
  if (!w || savingFav.value) return;
  savingFav.value = true;
  try {
    if (isFav.value) {
      const existing = favoriteStore.items.find(
        (f) => f.city.trim().toLowerCase() === w.city.trim().toLowerCase()
      );
      if (existing) await favoriteStore.remove(existing.id);
    } else {
      await favoriteStore.add(w.city, w.latitude, w.longitude);
    }
  } catch {
    /* noop */
  } finally {
    savingFav.value = false;
  }
};

const goBack = () => {
  weatherStore.clearState();
  router.push({ name: 'home' });
};
</script>

<template>
  <div
    class="result-scene"
    v-if="weatherStore.currentWeather"
    :style="{ background: theme.gradient }"
  >
    <div class="result-card">
      <!-- Botón volver -->
      <button class="btn-back" @click="goBack" aria-label="Volver al inicio">
        ← Volver
      </button>

      <!-- Botón favorita (estrella) -->
      <button
        class="btn-fav"
        :class="{ 'btn-fav--on': isFav }"
        :disabled="savingFav"
        @click="toggleFavorite"
        :aria-label="isFav ? 'Quitar de favoritas' : 'Agregar a favoritas'"
        :title="isFav ? 'Quitar de favoritas' : 'Agregar a favoritas'"
      >
        {{ isFav ? '★' : '☆' }}
      </button>

      <!-- Ciudad -->
      <h2 class="city-name">{{ weatherStore.currentWeather.city }}</h2>

      <!-- Ícono animado según el clima -->
      <div class="icon-wrap">
        <WeatherIcon :kind="theme.kind" :size="130" />
      </div>

      <!-- Temperatura principal -->
      <div class="temperature-display" aria-label="Temperatura actual">
        <span class="temp-value">{{ temp }}</span>
        <span class="temp-unit">°C</span>
      </div>
      <p class="condition-text">{{ weatherStore.currentWeather.condition_text }}</p>

      <!-- Coordenadas -->
      <FilaCoordenadas
        :latitude="weatherStore.currentWeather.latitude"
        :longitude="weatherStore.currentWeather.longitude"
      />

      <!-- Indicador de origen del dato -->
      <InsigniaOrigen
        v-if="weatherStore.sourceInfo"
        :source="weatherStore.sourceInfo"
      />
    </div>
  </div>
</template>

<style scoped>
/* Escena a pantalla completa con el degradado del clima */
.result-scene {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  border-radius: 20px;
  transition: background 0.6s ease;
}

/* Tarjeta translúcida (glass) sobre el degradado */
.result-card {
  position: relative;
  width: 100%;
  max-width: 380px;
  padding: 28px 26px 26px;
  border-radius: 20px;
  text-align: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

.btn-back {
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-back:hover { background: rgba(255, 255, 255, 0.3); }

/* Botón favorita (estrella), simétrico al de volver */
.btn-fav {
  position: absolute;
  top: 14px;
  right: 16px;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}
.btn-fav:hover:not(:disabled) { background: rgba(255, 255, 255, 0.3); transform: scale(1.08); }
.btn-fav:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-fav--on { color: #ffd94a; }

.city-name {
  margin: 14px 0 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.icon-wrap {
  display: flex;
  justify-content: center;
  margin: 6px 0;
}

.temperature-display {
  display: inline-flex;
  align-items: flex-start;
  gap: 4px;
  margin-top: 2px;
}
.temp-value {
  font-size: 76px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}
.temp-unit {
  font-size: 28px;
  font-weight: 600;
  margin-top: 10px;
  opacity: 0.9;
}

.condition-text {
  margin: 6px 0 20px;
  font-size: 17px;
  font-weight: 500;
  text-transform: capitalize;
  opacity: 0.95;
}
</style>
