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
  background: #ffffff;
  border-radius: 16px;
  padding: 36px 32px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.auth-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e3c72;
  margin: 0 0 6px;
}

.auth-subtitle {
  font-size: 12px;
  color: #888;
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
  color: #555;
}

.field-input {
  border: 1px solid #d0d7e2;
  border-radius: 8px;
  padding: 11px 13px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.field-input:focus {
  border-color: #2a5298;
}

.btn-primary {
  background: #2a5298;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #1e3c72;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-badge {
  background: #fff0f0;
  color: #c62828;
  border: 1px solid #ffcdd2;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
}

.auth-foot {
  text-align: center;
  margin-top: 20px;
  font-size: 13px;
  color: #777;
}

.auth-link {
  color: #2a5298;
  font-weight: 600;
  text-decoration: none;
}

.auth-link:hover {
  text-decoration: underline;
}
</style>
