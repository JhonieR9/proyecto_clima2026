<!-- frontend/src/App.vue -->
<!-- Punto de entrada: aplica el DefaultLayout y renderiza la vista activa -->
<script setup lang="ts">
import ClimaLayout from './layouts/ClimaLayout.vue';
</script>

<template>
  <ClimaLayout>
    <RouterView />
  </ClimaLayout>
</template>
