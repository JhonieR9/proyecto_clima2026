<!-- frontend/src/views/ResultadoClimaView.vue -->
<!-- ─────────────────────────────────────────────────────── -->
<!-- Qué hace: Pantalla de resultado. Usa position:fixed para que el gradiente      -->
<!--           cubra toda la ventana. Muestra ciudad, ícono animado, temperatura,   -->
<!--           condición, coordenadas, humedad e insignia de origen del dato.        -->
<!--           La estrella alterna la favorita con un toque.                         -->
<!-- Conectado con: weather.store.ts, favorite.store.ts, FilaCoordenadas.vue,       -->
<!--               InsigniaOrigen.vue, WeatherIcon.vue, weatherTheme.ts.             -->
<!-- Rol: Vista principal de resultado. Demuestra el caché (insignia) y el diseño dinámico. -->
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

/**
 * Computed: tema visual (gradiente + tipo de ícono) derivado de la condición del clima.
 * Se recalcula automáticamente si currentWeather cambia (aunque en esta vista no debería).
 */
const theme = computed(() =>
  themeFromCondition(weatherStore.currentWeather?.condition_text ?? '')
);

/**
 * Computed: temperatura redondeada para mostrar el número grande sin decimales.
 * Math.round evita "19.9°C" en lugar de "20°C" (más limpio visualmente).
 */
const temp = computed(() =>
  Math.round(Number(weatherStore.currentWeather?.temperature ?? 0))
);

/**
 * Computed: ¿la ciudad actual ya está en las favoritas del usuario?
 * Se usa para alternar el ícono de estrella (★ llena / ☆ vacía).
 */
const isFav = computed(() =>
  weatherStore.currentWeather
    ? favoriteStore.isFavorite(weatherStore.currentWeather.city)
    : false
);

/** Ref para evitar doble clic mientras se guarda/elimina la favorita. */
const savingFav = ref(false);

/**
 * Carga la lista de favoritas si aún está vacía.
 * Permite que la estrella muestre el estado correcto aunque el usuario
 * haya llegado a esta vista directamente (ej. navegación hacia atrás).
 */
onMounted(() => {
  if (favoriteStore.items.length === 0) {
    favoriteStore.load().catch(() => {});
  }
});

/**
 * Alterna el estado de favorita de la ciudad actual.
 * Si ya es favorita: la elimina buscando su ID en la lista local.
 * Si no es favorita: la agrega con las coordenadas del resultado del clima.
 * savingFav previene doble procesamiento durante la operación.
 */
const toggleFavorite = async () => {
  const w = weatherStore.currentWeather;
  if (!w || savingFav.value) return;
  savingFav.value = true;
  try {
    if (isFav.value) {
      // Busca el ID de la favorita existente para poder eliminarla.
      const existing = favoriteStore.items.find(
        (f) => f.city.trim().toLowerCase() === w.city.trim().toLowerCase()
      );
      if (existing) await favoriteStore.remove(existing.id);
    } else {
      await favoriteStore.add(w.city, w.latitude, w.longitude);
    }
  } catch {
    /* noop: si falla, la estrella vuelve a su estado anterior */
  } finally {
    savingFav.value = false;
  }
};

/**
 * Vuelve al buscador y limpia el estado del clima.
 * clearState() pone currentWeather a null, lo que hace que el guard de
 * beforeEnter de /result impida volver accidentalmente con F5.
 */
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
      <!-- Botón volver: limpia el estado del store y navega al buscador -->
      <button class="btn-back" @click="goBack" aria-label="Volver al inicio">
        ← Volver
      </button>

      <!-- Botón favorita: estrella llena (★) si es favorita, vacía (☆) si no lo es -->
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

      <!-- Ícono animado SVG según el tipo de tiempo (sunny, rain, snow, etc.) -->
      <div class="icon-wrap">
        <WeatherIcon :kind="theme.kind" :size="130" />
      </div>

      <!-- Temperatura principal: valor redondeado en grande -->
      <div class="temperature-display" aria-label="Temperatura actual">
        <span class="temp-value">{{ temp }}</span>
        <span class="temp-unit">°C</span>
      </div>
      <p class="condition-text">{{ weatherStore.currentWeather.condition_text }}</p>

      <!-- Coordenadas y humedad (opcional: solo si la BD tiene el campo humidity) -->
      <FilaCoordenadas
        :latitude="weatherStore.currentWeather.latitude"
        :longitude="weatherStore.currentWeather.longitude"
        :humidity="weatherStore.currentWeather.humidity"
      />

      <!-- Insignia de origen del dato: demuestra qué nivel de caché sirvió el resultado -->
      <InsigniaOrigen
        v-if="weatherStore.sourceInfo"
        :source="weatherStore.sourceInfo"
      />
    </div>
  </div>
</template>

<style scoped>
/* Escena inmersiva: el degradado del clima cubre TODA la ventana, por detrás
   del navbar/footer del layout. position: fixed la saca del contenedor
   centrado del layout para ocupar la pantalla completa. */
.result-scene {
  position: fixed;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  overflow-y: auto;
  transition: background 0.6s ease;
}

/* Tarjeta translúcida (glass) sobre el degradado */
.result-card {
  position: relative;
  width: 100%;
  max-width: 380px;
  padding: 28px 26px 26px;
  border-radius: 24px;
  text-align: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.35);
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
/* Color dorado cuando la ciudad ya es favorita */
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
