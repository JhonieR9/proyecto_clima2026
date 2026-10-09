<!-- frontend/src/App.vue -->
<!-- Punto de entrada: aplica el DefaultLayout y renderiza la vista activa -->
<script setup lang="ts">
import DefaultLayout from './layouts/DefaultLayout.vue';
</script>

<template>
  <DefaultLayout>
    <RouterView />
  </DefaultLayout>
</template>
