<!-- frontend/src/components/SearchBox.vue -->
<!-- Componente reutilizable: campo de texto + botón para buscar una ciudad -->
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'search', city: string): void;
}>();

const cityInput = ref('');

const handleSearch = () => {
  const city = cityInput.value.trim();
  if (!city) return;
  emit('search', city);
};
</script>

<template>
  <div class="search-box">
    <input
      v-model="cityInput"
      type="text"
      placeholder="Escribe una ciudad (ej: Bogota, Cali)..."
      aria-label="Nombre de la ciudad"
      @keyup.enter="handleSearch"
    />
    <button :disabled="props.loading" @click="handleSearch">
      {{ props.loading ? 'Buscando...' : 'Buscar' }}
    </button>
  </div>
</template>

<style scoped>
.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

input {
  flex: 1;
  padding: 12px 14px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.25s;
  color: #333;
}

input:focus {
  border-color: #2a5298;
}

button {
  padding: 12px 18px;
  background: #2a5298;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.25s;
}

button:hover:not(:disabled) {
  background: #1e3c72;
}

button:disabled {
  background: #9ab;
  cursor: not-allowed;
}
</style>
