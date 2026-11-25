<!-- frontend/src/App.vue -->
<!-- ─────────────────────────────────────────────────────── -->
<!-- Qué hace: Componente raíz de la aplicación. Envuelve la vista activa dentro  -->
<!--           de ClimaLayout y renderiza RouterView (la pantalla de la URL actual). -->
<!-- Conectado con: ClimaLayout.vue (el marco visual), main.ts (lo monta en el DOM). -->
<!-- Rol: Punto de montaje del árbol de componentes. Une el layout con el sistema de rutas. -->
<script setup lang="ts">
import ClimaLayout from './layouts/ClimaLayout.vue';
</script>

<template>
  <ClimaLayout>
    <RouterView />
  </ClimaLayout>
</template>
