<!-- frontend/src/App.vue -->
<!-- Componente raíz: aplica el layout principal y renderiza la vista activa. -->
<!-- Conectado con: ClimaLayout.vue, main.ts -->
<script setup lang="ts">
import ClimaLayout from './layouts/ClimaLayout.vue';
</script>

<template>
  <ClimaLayout>
    <RouterView />
  </ClimaLayout>
</template>
