// backend/backweb/src/controllers/auth.controller.js
// ─────────────────────────────────────────────────────────
// Qué hace: Traduce las peticiones HTTP de autenticación al servicio correspondiente.
//           Gestiona la cookie segura del refresh token (HttpOnly, SameSite=Strict, Secure).
//           El access token lo devuelve solo en el cuerpo de la respuesta.
// Conectado con: auth.service.js (delega la lógica de negocio), auth.routes.js (lo registra).
// Rol: Controlador HTTP de auth. No tiene lógica de negocio; solo traduce y responde.
const AuthService = require('../services/auth.service');

const REFRESH_COOKIE = 'refreshToken';

/**
 * Genera las opciones de la cookie que transporta el refresh token.
 * - httpOnly: evita que JS del navegador la lea (protección XSS).
 * - secure: fuerza HTTPS en producción para evitar sniffing.
 * - sameSite: 'strict' mitiga ataques CSRF.
 * - path: restringe la cookie a las rutas de auth (no se envía en /api/weather).
 * - maxAge: 7 días, igual al TTL del refresh token en la BD.
 *
 * @returns {import('express').CookieOptions}
 */
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
  /**
   * Registra un nuevo usuario. No inicia sesión automáticamente;
   * el flujo espera que el usuario vaya al login tras registrarse.
   *
   * @param {import('express').Request}  req  - req.body validado por registerSchema
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const user = await AuthService.register(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Inicia sesión. Responde con el access token en el body y pone el refresh
   * token en una cookie HttpOnly (inaccesible desde JS).
   * El cliente guarda el access token SOLO en memoria para mitigar XSS.
   *
   * @param {import('express').Request}  req  - req.body validado por loginSchema
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
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

  /**
   * Rota el refresh token. Lee el token de la cookie, lo invalida y emite un
   * par nuevo. Si el token fue reutilizado (posible robo), el servicio revoca
   * todas las sesiones del usuario.
   *
   * @param {import('express').Request}  req  - req.cookies[refreshToken]
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
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

  /**
   * Cierra la sesión actual: revoca el refresh token en la BD y limpia la cookie.
   * El access token (en memoria del cliente) expira naturalmente en 15 min.
   *
   * @param {import('express').Request}  req  - req.cookies[refreshToken]
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
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

  /**
   * Devuelve el perfil completo del usuario autenticado.
   * Se consulta de la BD (no del payload del token) para incluir campos como
   * role y created_at que no siempre están en el token.
   *
   * @param {import('express').Request}  req  - req.user inyectado por authenticate
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
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
