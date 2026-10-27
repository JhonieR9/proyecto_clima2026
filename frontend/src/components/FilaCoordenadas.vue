<!-- frontend/src/components/GeoRow.vue -->
<!-- Componente reutilizable: muestra las coordenadas geográficas en chips -->
<script setup lang="ts">
defineProps<{
  latitude: number;
  longitude: number;
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
  </div>
</template>

<style scoped>
.geo-row {
  display: flex;
  justify-content: center;
  gap: 12px;
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
