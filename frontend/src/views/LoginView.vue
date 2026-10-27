<!-- frontend/src/views/LoginView.vue -->
<!-- Inicio de sesión. Usa el auth store (token en memoria + cookie HttpOnly). -->
<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

// Formulario tipado (cero 'any').
const form = reactive<{ email: string; password: string }>({
  email: '',
  password: '',
});

const handleSubmit = async () => {
  try {
    await auth.login({ email: form.email, password: form.password });
    // Redirige a la ruta que el usuario intentaba visitar, o al inicio.
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    router.push(redirect);
  } catch {
    // El mensaje de error ya quedó en auth.error; la plantilla lo muestra.
  }
};
</script>

<template>
  <div class="auth-card">
    <div class="auth-header">
      <h1 class="auth-title">Iniciar sesión 🔐</h1>
      <p class="auth-subtitle">Accede a tu cuenta</p>
    </div>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <label class="field">
        <span class="field-label">Email</span>
        <input
          v-model="form.email"
          type="email"
          required
          autocomplete="email"
          placeholder="tu@email.com"
          class="field-input"
        />
      </label>

      <label class="field">
        <span class="field-label">Contraseña</span>
        <input
          v-model="form.password"
          type="password"
          required
          autocomplete="current-password"
          placeholder="••••••••"
          class="field-input"
        />
      </label>

      <div v-if="auth.error" class="error-badge" role="alert">❌ {{ auth.error }}</div>

      <button type="submit" class="btn-primary" :disabled="auth.loading">
        {{ auth.loading ? 'Entrando...' : 'Entrar' }}
      </button>
    </form>

    <p class="auth-foot">
      ¿No tienes cuenta?
      <RouterLink :to="{ name: 'register' }" class="auth-link">Regístrate</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.auth-card {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  padding: 36px 32px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  color: #fff;
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.auth-title {
  font-size: 23px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 6px;
}

.auth-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.field-input {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  padding: 11px 13px;
  font-size: 14px;
  color: #1a202c;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-input:focus {
  border-color: #fff;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.25);
}

.btn-primary {
  background: #ffffff;
  color: #1e3c72;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-badge {
  background: rgba(198, 40, 40, 0.9);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
}

.auth-foot {
  text-align: center;
  margin-top: 20px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.auth-link {
  color: #fff;
  font-weight: 700;
  text-decoration: underline;
}

.auth-link:hover {
  opacity: 0.85;
}
</style>
