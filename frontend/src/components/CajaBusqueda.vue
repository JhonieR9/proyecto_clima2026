<!-- frontend/src/components/CajaBusqueda.vue -->
<!-- Buscador con AUTOCOMPLETADO: al escribir (desde 3 letras) sugiere ciudades
     vía /api/weather/suggest; al seleccionar una, emite la búsqueda del clima. -->
<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { WeatherService, type CitySuggestion } from '../services/weather.service';

const props = defineProps<{
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'search', city: string): void;
}>();

const cityInput = ref('');
const suggestions = ref<CitySuggestion[]>([]);
const open = ref(false);          // ¿desplegable visible?
const highlighted = ref(-1);      // índice resaltado para navegar con teclado
const loadingSuggest = ref(false);

const MIN_CHARS = 3;              // desde cuántas letras pedimos sugerencias
const DEBOUNCE_MS = 300;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
// Token para ignorar respuestas viejas que llegan tarde (race condition).
let requestSeq = 0;

// Dispara la búsqueda de sugerencias con debounce cuando cambia el texto.
watch(cityInput, (value) => {
  const q = value.trim();
  highlighted.value = -1;

  if (debounceTimer) clearTimeout(debounceTimer);

  if (q.length < MIN_CHARS) {
    suggestions.value = [];
    open.value = false;
    return;
  }

  debounceTimer = setTimeout(async () => {
    const seq = ++requestSeq;
    loadingSuggest.value = true;
    try {
      const results = await WeatherService.suggestCities(q);
      // Solo aplicamos si es la respuesta más reciente.
      if (seq === requestSeq) {
        suggestions.value = results;
        open.value = results.length > 0;
      }
    } catch {
      if (seq === requestSeq) {
        suggestions.value = [];
        open.value = false;
      }
    } finally {
      if (seq === requestSeq) loadingSuggest.value = false;
    }
  }, DEBOUNCE_MS);
});

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

// Selecciona una ciudad del desplegable y lanza la búsqueda del clima.
function selectCity(s: CitySuggestion) {
  cityInput.value = s.name;
  open.value = false;
  suggestions.value = [];
  emit('search', s.name);
}

// Buscar con el texto tal cual (botón o Enter sin resaltado).
function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) return;
  open.value = false;
  emit('search', city);
}

// Navegación con teclado dentro del desplegable.
function onKeydown(e: KeyboardEvent) {
  if (!open.value || suggestions.value.length === 0) {
    if (e.key === 'Enter') handleSearch();
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlighted.value = (highlighted.value + 1) % suggestions.value.length;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlighted.value =
      (highlighted.value - 1 + suggestions.value.length) % suggestions.value.length;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (highlighted.value >= 0) {
      selectCity(suggestions.value[highlighted.value]);
    } else {
      handleSearch();
    }
  } else if (e.key === 'Escape') {
    open.value = false;
  }
}

// Cierra el desplegable al perder el foco (con pequeño retardo para permitir el clic).
function onBlur() {
  setTimeout(() => {
    open.value = false;
  }, 150);
}
</script>

<template>
  <div class="search-box">
    <div class="input-wrap">
      <input
        v-model="cityInput"
        type="text"
        placeholder="Escribe una ciudad (ej: Cali, Bogota)..."
        aria-label="Nombre de la ciudad"
        autocomplete="off"
        role="combobox"
        :aria-expanded="open"
        aria-controls="city-suggestions"
        @keydown="onKeydown"
        @focus="open = suggestions.length > 0"
        @blur="onBlur"
      />

      <!-- Desplegable de sugerencias -->
      <ul
        v-if="open"
        id="city-suggestions"
        class="suggestions"
        role="listbox"
      >
        <li
          v-for="(s, i) in suggestions"
          :key="`${s.latitude},${s.longitude}`"
          class="suggestion"
          :class="{ 'suggestion--active': i === highlighted }"
          role="option"
          :aria-selected="i === highlighted"
          @mousedown.prevent="selectCity(s)"
          @mouseenter="highlighted = i"
        >
          <span class="suggestion-name">{{ s.name }}</span>
          <span class="suggestion-meta">{{ [s.admin1, s.country].filter(Boolean).join(', ') }}</span>
        </li>
      </ul>
    </div>

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

.input-wrap {
  position: relative;
  flex: 1;
}

input {
  width: 100%;
  box-sizing: border-box;
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

/* Desplegable */
.suggestions {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  z-index: 20;
  max-height: 260px;
  overflow-y: auto;
  text-align: left;
}

.suggestion {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.suggestion--active {
  background: #eef2ff;
}

.suggestion-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e3c72;
}

.suggestion-meta {
  font-size: 12px;
  color: #718096;
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
  align-self: flex-start;
}

button:hover:not(:disabled) {
  background: #1e3c72;
}

button:disabled {
  background: #9ab;
  cursor: not-allowed;
}
</style>
