// frontend/vite.config.ts
// ─────────────────────────────────────────────────────────
// Qué hace: Configuración mínima de Vite para el proyecto frontend.
//           Registra el plugin de Vue para que Vite procese los archivos .vue.
//           La configuración avanzada de TypeScript está en tsconfig.app.json.
// Conectado con: (ninguno — es la configuración del bundler, no importa código del proyecto).
// Rol: Sin este archivo Vite no sabría cómo procesar los archivos Vue.
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
})
