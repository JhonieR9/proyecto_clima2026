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

      <Transition name="alert">
        <div v-if="auth.error" class="alert alert--error" role="alert">
          <span class="alert-icon" aria-hidden="true">!</span>
          <span class="alert-text">{{ auth.error }}</span>
        </div>
      </Transition>
      <Transition name="alert">
        <div v-if="success" class="alert alert--success" role="status">
          <span class="alert-icon" aria-hidden="true">✓</span>
          <span class="alert-text">Cuenta creada. Redirigiendo al login...</span>
        </div>
      </Transition>

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

/* Avisos elegantes (error / éxito) */
.alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  backdrop-filter: blur(6px);
}

.alert--error {
  background: rgba(220, 38, 38, 0.22);
  border: 1px solid rgba(248, 113, 113, 0.5);
  color: #fff;
}

.alert--success {
  background: rgba(22, 163, 74, 0.22);
  border: 1px solid rgba(74, 222, 128, 0.5);
  color: #fff;
}

.alert-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 800;
  font-size: 13px;
  color: #fff;
}

.alert--error .alert-icon { background: rgba(248, 113, 113, 0.9); }
.alert--success .alert-icon { background: rgba(74, 222, 128, 0.9); }

.alert-text { line-height: 1.35; }

/* Animación de entrada/salida */
.alert-enter-active,
.alert-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.alert-enter-from,
.alert-leave-to {
  opacity: 0;
  transform: translateY(-8px);
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
