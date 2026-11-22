// frontend/vite.config.ts
// Configuración de Vite para compilar y servir el proyecto Vue.
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
})
