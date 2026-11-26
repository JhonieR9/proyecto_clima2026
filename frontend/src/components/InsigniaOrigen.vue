<!-- frontend/src/components/InsigniaOrigen.vue -->
<!-- ─────────────────────────────────────────────────────── -->
<!-- Qué hace: Muestra el origen del dato del clima con un aviso visual coloreado.  -->
<!--           Agrupa los 5 valores de source en 3 estados: caché (memory/cache),   -->
<!--           API fresca (api_fresh) y dato antiguo revalidando (stale/stale_fallback). -->
<!-- Conectado con: weather.service.ts (tipo WeatherSource), ResultadoClimaView.vue. -->
<!-- Rol: Componente académico central. Demuestra en tiempo real el sistema de caché multinivel. -->
<script setup lang="ts">
import { computed } from 'vue';
import type { WeatherSource } from '../services/weather.service';

const props = defineProps<{
  /** Origen del dato devuelto por el backend (memory | cache | stale | api_fresh | stale_fallback) */
  source: WeatherSource;
}>();

/**
 * Agrupa los 5 orígenes del backend en 3 estados visuales:
 *   cached  -> vino de caché (memoria L1 o PostgreSQL L2 fresco)
 *   fresh   -> consultado directo a la API externa
 *   stale   -> servido de caché vieja (revalidando) o respaldo por caída de la API
 *
 * Esta agrupación simplifica el diseño: 3 colores en vez de 5.
 */
type BadgeKind = 'cached' | 'fresh' | 'stale';

const kind = computed<BadgeKind>(() => {
  switch (props.source) {
    case 'memory':
    case 'cache':
      return 'cached';
    case 'api_fresh':
      return 'fresh';
    case 'stale':
    case 'stale_fallback':
      return 'stale';
    default:
      return 'fresh';
  }
});

/**
 * Clase CSS dinámica según el estado del dato.
 * Las tres clases definen los tres colores de la insignia: verde, índigo y ámbar.
 */
// Clase CSS segun el estado.
const badgeClass = computed(() => ({
  cached: 'source-cache',
  fresh: 'source-api',
  stale: 'source-stale',
}[kind.value]));
</script>

<template>
  <div class="source-badge" :class="badgeClass" role="status">
    <!-- Datos recuperados desde la caché (memoria o PostgreSQL) -->
    <template v-if="kind === 'cached'">
      <span class="source-icon" aria-hidden="true">📦</span>
      <div class="source-text">
        <strong>Recuperado desde Caché</strong>
        <!-- Distingue L1 (memoria, latencia cero) de L2 (PostgreSQL, una sola query) -->
        <small v-if="source === 'memory'">Memoria (L1) &mdash; Cero latencia</small>
        <small v-else>PostgreSQL (L2) &mdash; Cero latencia extra</small>
      </div>
    </template>

    <!-- Datos frescos obtenidos directamente desde la API externa -->
    <template v-else-if="kind === 'fresh'">
      <span class="source-icon" aria-hidden="true">🌐</span>
      <div class="source-text">
        <strong>Recuperado desde API Externa</strong>
        <small>Open-Meteo &mdash; Dato fresco registrado en BD</small>
      </div>
    </template>

    <!-- Dato de caché vieja: servido al instante mientras se revalida o por caída de la API -->
    <template v-else>
      <span class="source-icon" aria-hidden="true">♻️</span>
      <div class="source-text">
        <strong>Dato en Caché (revalidando)</strong>
        <!-- stale_fallback: la API no respondió; stale: se sirve y se revalida en segundo plano -->
        <small v-if="source === 'stale_fallback'">La API no respondió &mdash; se muestra el último dato conocido</small>
        <small v-else>Servido al instante &mdash; actualizándose en segundo plano</small>
      </div>
    </template>
  </div>
</template>

<style scoped>
.source-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  text-align: left;
}

/* Variante caché — verde azulado */
.source-cache {
  background: #e6fffa;
  color: #00695c;
  border: 1px solid #b2dfdb;
}

/* Variante API fresca — índigo */
.source-api {
  background: #eef2ff;
  color: #283593;
  border: 1px solid #c5cae9;
}

/* Variante caché vieja / revalidando — ámbar */
.source-stale {
  background: #fff8e1;
  color: #8d6e00;
  border: 1px solid #ffe082;
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
