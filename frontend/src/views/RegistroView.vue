<!-- frontend/src/views/RegistroView.vue -->
<!-- Registro de usuario. Tras crear la cuenta, redirige al login. -->
<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = useRouter();
const auth = useAuthStore();

// Formulario tipado (cero 'any').
const form = reactive<{ name: string; email: string; password: string }>({
  name: '',
  email: '',
  password: '',
});

const success = ref(false);

const handleSubmit = async () => {
  success.value = false;
  try {
    await auth.register({ name: form.name, email: form.email, password: form.password });
    success.value = true;
    // Pequeña pausa para que se vea la confirmación antes de ir al login.
    setTimeout(() => router.push({ name: 'login' }), 900);
  } catch {
    // El mensaje de error queda en auth.error.
  }
};
</script>

<template>
  <div class="auth-card">
    <div class="auth-header">
      <h1 class="auth-title">Crear cuenta ✨</h1>
      <p class="auth-subtitle">Regístrate para empezar</p>
    </div>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <label class="field">
        <span class="field-label">Nombre</span>
        <input
          v-model="form.name"
          type="text"
          required
          minlength="2"
          autocomplete="name"
          placeholder="Tu nombre"
          class="field-input"
        />
      </label>

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
          minlength="8"
          autocomplete="new-password"
          placeholder="Mínimo 8 caracteres"
          class="field-input"
        />
      </label>

      <div v-if="auth.error" class="error-badge" role="alert">❌ {{ auth.error }}</div>
      <div v-if="success" class="success-badge" role="status">
        ✅ Cuenta creada. Redirigiendo al login...
      </div>

      <button type="submit" class="btn-primary" :disabled="auth.loading">
        {{ auth.loading ? 'Creando...' : 'Registrarme' }}
      </button>
    </form>

    <p class="auth-foot">
      ¿Ya tienes cuenta?
      <RouterLink :to="{ name: 'login' }" class="auth-link">Inicia sesión</RouterLink>
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

.success-badge {
  background: #effaf3;
  color: #1b7a43;
  border: 1px solid #bce5cd;
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
