<!-- frontend/src/components/SourceBadge.vue -->
<!-- Componente reutilizable: indicador visual del origen del dato (caché PostgreSQL vs API externa) -->
<!-- Este es el componente académico central del proyecto — demuestra el sistema de caching -->
<script setup lang="ts">
defineProps<{
  source: 'cache' | 'api_fresh';
}>();
</script>

<template>
  <div
    class="source-badge"
    :class="source === 'cache' ? 'source-cache' : 'source-api'"
    role="status"
  >
    <!-- Datos recuperados desde la caché de PostgreSQL -->
    <template v-if="source === 'cache'">
      <span class="source-icon" aria-hidden="true">📦</span>
      <div class="source-text">
        <strong>Recuperado desde Caché</strong>
        <small>PostgreSQL &mdash; Cero latencia extra</small>
      </div>
    </template>

    <!-- Datos frescos obtenidos directamente desde la API externa -->
    <template v-else>
      <span class="source-icon" aria-hidden="true">🌐</span>
      <div class="source-text">
        <strong>Recuperado desde API Externa</strong>
        <small>Open-Meteo &mdash; Dato fresco registrado en BD</small>
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
