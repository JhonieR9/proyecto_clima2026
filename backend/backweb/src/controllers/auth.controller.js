// backend/backweb/src/controllers/auth.controller.js
// Controlador de autenticación. Solo traduce HTTP <-> servicio y gestiona la
// cookie HttpOnly del refresh token. CORE: "Refresh Token rotativo en cookies
// seguras (HttpOnly, SameSite=Strict, Secure)".
const AuthService = require('../services/auth.service');

const REFRESH_COOKIE = 'refreshToken';

// Opciones de la cookie segura donde viaja el refresh token.
function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,            // inaccesible desde JS del navegador (anti-XSS)
    secure: isProd,            // solo HTTPS en producción
    sameSite: 'strict',        // mitiga CSRF
    path: '/api/auth',         // la cookie solo se envía a las rutas de auth
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
  };
}

const AuthController = {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const user = await AuthService.register(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { accessToken, refreshToken, user } = await AuthService.login(req.body);
      res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
      // El access token se devuelve en el body: el cliente lo guarda EN MEMORIA.
      res.json({ success: true, data: { accessToken, user } });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/refresh  (rotación)
  async refresh(req, res, next) {
    try {
      const oldToken = req.cookies[REFRESH_COOKIE];
      const { accessToken, refreshToken, user } = await AuthService.refresh(oldToken);
      res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
      res.json({ success: true, data: { accessToken, user } });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/logout
  async logout(req, res, next) {
    try {
      await AuthService.logout(req.cookies[REFRESH_COOKIE]);
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
      res.json({ success: true, message: 'Sesión cerrada' });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/auth/me  (requiere authenticate)
  // Devuelve el perfil completo (id, name, email, role), no solo lo que trae el token.
  async me(req, res, next) {
    try {
      const user = await AuthService.getProfile(req.user.id);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AuthController;
