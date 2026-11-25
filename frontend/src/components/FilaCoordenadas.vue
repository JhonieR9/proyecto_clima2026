<!-- frontend/src/components/FilaCoordenadas.vue -->
<!-- ─────────────────────────────────────────────────────── -->
<!-- Qué hace: Muestra latitud, longitud y humedad como chips visuales translúcidos. -->
<!--           La humedad es opcional: solo aparece si el prop llega con valor.       -->
<!--           Los colores se integran con el fondo glass de la tarjeta de clima.     -->
<!-- Conectado con: ResultadoClimaView.vue (lo instancia con los datos del clima).    -->
<!-- Rol: Componente de presentación de datos geográficos y meteorológicos secundarios. -->
<script setup lang="ts">
defineProps<{
  latitude: number;
  longitude: number;
  /** Humedad relativa en %. Si no viene, no se muestra la casilla. */
  humidity?: number | null;
}>();
</script>

<template>
  <div class="geo-row">
    <div class="geo-chip">
      <span class="geo-label">Latitud</span>
      <span class="geo-value">{{ latitude }}</span>
    </div>
    <div class="geo-chip">
      <span class="geo-label">Longitud</span>
      <span class="geo-value">{{ longitude }}</span>
    </div>
    <div class="geo-chip" v-if="humidity != null">
      <span class="geo-label">Humedad</span>
      <span class="geo-value">{{ humidity }}%</span>
    </div>
  </div>
</template>

<style scoped>
.geo-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-bottom: 24px;
}

.geo-chip {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
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
  color: rgba(255, 255, 255, 0.75);
  font-weight: 600;
}

.geo-value {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}
</style>
