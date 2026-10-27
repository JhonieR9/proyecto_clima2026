<!-- frontend/src/components/WeatherIcon.vue -->
<!-- Ícono de clima en SVG animado, según el tipo de condición. -->
<script setup lang="ts">
import type { WeatherKind } from '../utils/weatherTheme';

defineProps<{
  kind: WeatherKind;
  size?: number;
}>();
</script>

<template>
  <svg
    class="wicon"
    :width="size || 120"
    :height="size || 120"
    viewBox="0 0 120 120"
    aria-hidden="true"
  >
    <!-- SOL -->
    <g v-if="kind === 'sunny'">
      <g class="spin-slow" style="transform-origin: 60px 60px">
        <g stroke="#fff3b0" stroke-width="5" stroke-linecap="round">
          <line x1="60" y1="12" x2="60" y2="26" />
          <line x1="60" y1="94" x2="60" y2="108" />
          <line x1="12" y1="60" x2="26" y2="60" />
          <line x1="94" y1="60" x2="108" y2="60" />
          <line x1="26" y1="26" x2="36" y2="36" />
          <line x1="84" y1="84" x2="94" y2="94" />
          <line x1="94" y1="26" x2="84" y2="36" />
          <line x1="36" y1="84" x2="26" y2="94" />
        </g>
      </g>
      <circle cx="60" cy="60" r="24" fill="#fff3b0" class="pulse" />
    </g>

    <!-- NUBLADO -->
    <g v-else-if="kind === 'cloudy'" class="drift">
      <ellipse cx="50" cy="60" rx="30" ry="20" fill="#f0f2f5" />
      <ellipse cx="78" cy="55" rx="22" ry="17" fill="#dfe4ea" />
      <ellipse cx="60" cy="74" rx="36" ry="15" fill="#cfd6de" />
    </g>

    <!-- LLUVIA -->
    <g v-else-if="kind === 'rain'">
      <g class="drift">
        <ellipse cx="52" cy="48" rx="30" ry="20" fill="#e8edf2" />
        <ellipse cx="80" cy="44" rx="20" ry="15" fill="#e8edf2" />
      </g>
      <g stroke="#9ec5ff" stroke-width="5" stroke-linecap="round">
        <line x1="44" y1="78" x2="38" y2="96" class="drop" style="animation-delay:0s" />
        <line x1="62" y1="78" x2="56" y2="96" class="drop" style="animation-delay:.25s" />
        <line x1="80" y1="78" x2="74" y2="96" class="drop" style="animation-delay:.5s" />
      </g>
    </g>

    <!-- NIEVE -->
    <g v-else-if="kind === 'snow'">
      <g class="drift">
        <ellipse cx="52" cy="48" rx="30" ry="20" fill="#eef5ff" />
        <ellipse cx="80" cy="44" rx="20" ry="15" fill="#eef5ff" />
      </g>
      <g fill="#ffffff">
        <circle cx="44" cy="86" r="4" class="fall" style="animation-delay:0s" />
        <circle cx="62" cy="86" r="4" class="fall" style="animation-delay:.3s" />
        <circle cx="80" cy="86" r="4" class="fall" style="animation-delay:.6s" />
      </g>
    </g>

    <!-- TORMENTA -->
    <g v-else-if="kind === 'storm'">
      <g class="drift">
        <ellipse cx="52" cy="46" rx="30" ry="20" fill="#cfd6de" />
        <ellipse cx="80" cy="42" rx="20" ry="15" fill="#cfd6de" />
      </g>
      <polygon points="58,66 48,88 58,88 50,106 76,80 64,80 72,66" fill="#ffd94a" class="flash" />
    </g>

    <!-- NIEBLA -->
    <g v-else>
      <g stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.9">
        <line x1="30" y1="46" x2="90" y2="46" class="fogline" style="animation-delay:0s" />
        <line x1="26" y1="62" x2="94" y2="62" class="fogline" style="animation-delay:.4s" />
        <line x1="32" y1="78" x2="86" y2="78" class="fogline" style="animation-delay:.8s" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.wicon { display: block; }

/* Sol: giro lento + latido */
.spin-slow { animation: spin 14s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.pulse { animation: pulse 3s ease-in-out infinite; transform-origin: 60px 60px; }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }

/* Nubes: deriva suave horizontal */
.drift { animation: drift 5s ease-in-out infinite; }
@keyframes drift { 0%,100% { transform: translateX(-3px); } 50% { transform: translateX(3px); } }

/* Gotas de lluvia */
.drop { animation: drop 1s linear infinite; }
@keyframes drop { 0% { opacity: 0; transform: translateY(-6px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(6px); } }

/* Copos de nieve */
.fall { animation: fall 1.6s ease-in infinite; }
@keyframes fall { 0% { opacity: 0; transform: translateY(-8px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(10px); } }

/* Rayo de tormenta */
.flash { animation: flash 2s steps(1) infinite; transform-origin: center; }
@keyframes flash { 0%,100% { opacity: 1; } 45% { opacity: 0.2; } 50% { opacity: 1; } 55% { opacity: 0.2; } }

/* Niebla: franjas que se desplazan */
.fogline { animation: fog 3s ease-in-out infinite; }
@keyframes fog { 0%,100% { transform: translateX(-4px); opacity: 0.7; } 50% { transform: translateX(4px); opacity: 1; } }

/* Respeta usuarios que prefieren menos movimiento */
@media (prefers-reduced-motion: reduce) {
  .spin-slow, .pulse, .drift, .drop, .fall, .flash, .fogline { animation: none; }
}
</style>
