// frontend/src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './style.css'; // Mantiene tus estilos base

const app = createApp(App);
const pinia = createPinia();

// Acoplamos Pinia a la aplicación de Vue
app.use(pinia);

app.mount('#app');
