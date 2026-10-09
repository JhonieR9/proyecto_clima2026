<!-- frontend/src/views/NotFoundView.vue -->
<!-- Vista 404: página no encontrada -->
<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="notfound-card">
    <div class="notfound-icon" aria-hidden="true">🌫️</div>
    <h1 class="notfound-code">404</h1>
    <p class="notfound-message">Página no encontrada</p>
    <p class="notfound-hint">La ruta que buscas no existe o fue movida.</p>
    <button class="btn-home" @click="router.push({ name: 'home' })">
      ← Volver al inicio
    </button>
  </div>
</template>

<style scoped>
.notfound-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 48px 32px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.notfound-icon {
  font-size: 56px;
  margin-bottom: 8px;
}

.notfound-code {
  font-size: 72px;
  font-weight: 800;
  color: #1e3c72;
  margin: 0 0 8px;
  line-height: 1;
}

.notfound-message {
  font-size: 20px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px;
}

.notfound-hint {
  font-size: 14px;
  color: #718096;
  margin: 0 0 28px;
}

.btn-home {
  padding: 12px 24px;
  background: #2a5298;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.25s;
}

.btn-home:hover {
  background: #1e3c72;
}
</style>
