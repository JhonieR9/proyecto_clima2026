<!-- frontend/src/layouts/DefaultLayout.vue -->
<!-- Layout principal: envuelve todas las vistas con navbar y footer -->
<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = useRouter();
const auth = useAuthStore();

const handleLogout = async () => {
  await auth.logout();
  router.push({ name: 'login' });
};
</script>

<template>
  <div class="layout-wrapper">

    <!-- ===== NAVBAR ===== -->
    <header class="navbar">
      <div class="navbar-inner">
        <RouterLink to="/" class="navbar-brand">
          🌤️ <span>ClimaApp</span>
        </RouterLink>
        <nav class="navbar-links">
          <RouterLink to="/" class="nav-link" active-class="nav-link--active" exact>
            Inicio
          </RouterLink>
          <!-- Sesión: nombre del usuario + botón salir (solo si está autenticado) -->
          <template v-if="auth.isAuthenticated">
            <span class="nav-user" v-if="auth.user">👤 {{ auth.user.name }}</span>
            <button class="nav-logout" @click="handleLogout">Salir</button>
          </template>
        </nav>
      </div>
    </header>

    <!-- ===== CONTENIDO PRINCIPAL (slot de vistas) ===== -->
    <main class="layout-main">
      <slot />
    </main>

    <!-- ===== FOOTER ===== -->
    <footer class="footer">
      <p>
        ClimaApp &mdash; Sistema de Caching con PostgreSQL &mdash;
        <span class="footer-year">2026</span>
      </p>
    </footer>

  </div>
</template>

<style scoped>
/* ---------- Reset base del layout ---------- */
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* ---------- Navbar ---------- */
.navbar {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0 24px;
}

.navbar-inner {
  max-width: 960px;
  margin: 0 auto;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  text-decoration: none;
  letter-spacing: 0.5px;
}

.navbar-brand span {
  color: #90caf9;
}

.navbar-links {
  display: flex;
  gap: 24px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 4px 0;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.nav-link:hover,
.nav-link--active {
  color: #ffffff;
  border-bottom-color: #90caf9;
}

/* Nombre del usuario autenticado */
.nav-user {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
}

/* Botón de cerrar sesión */
.nav-logout {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.nav-logout:hover {
  background: rgba(255, 255, 255, 0.28);
}

/* ---------- Contenido ---------- */
.layout-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

/* ---------- Footer ---------- */
.footer {
  text-align: center;
  padding: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-year {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
}
</style>
