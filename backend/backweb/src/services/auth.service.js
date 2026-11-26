// backend/backweb/src/services/auth.service.js
// ─────────────────────────────────────────────────────────
// Qué hace: Contiene toda la lógica de negocio de autenticación. register verifica correo único.
//           login compara con bcrypt usando el mismo mensaje para email/password (anti-enumeración).
//           refresh hace rotación atómica (BEGIN/COMMIT) y detecta reuso de tokens revocando sesiones.
// Conectado con: db.js (withTransaction), user.model.js, refreshToken.model.js,
//               AppError.js, token.js, auth.controller.js.
// Rol: Servicio de autenticación. Única capa con reglas de negocio de sesión.
const { randomUUID } = require('crypto');
const pool = require('../config/db');
const UserModel = require('../models/user.model');
const RefreshTokenModel = require('../models/refreshToken.model');
const AppError = require('../utils/AppError');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/token');

/**
 * Elimina el campo password del objeto usuario antes de devolverlo al cliente.
 * Se llama en todos los métodos que devuelven datos de usuario para garantizar
 * que la contraseña hasheada nunca salga fuera de la capa de servicios.
 *
 * @param {object|null} user
 * @returns {object|null}
 */
// Quita el campo password antes de devolver un usuario al exterior.
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

/**
 * Calcula la fecha de expiración del refresh token para almacenarla en la BD.
 * Se lee de JWT_REFRESH_EXPIRES (formato "7d") pero solo se usa el número de días.
 * La columna expires_at en BD permite limpiezas periódicas de tokens caducados.
 *
 * @returns {Date}
 */
// Calcula la fecha de expiración del refresh token para persistirla.
function refreshExpiryDate() {
  const days = parseInt(process.env.JWT_REFRESH_EXPIRES || '7d', 10) || 7;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const AuthService = {
  /**
   * Registra un nuevo usuario. Verifica que el correo no exista antes de crear.
   * No inicia sesión automáticamente; el flujo de la app lleva al usuario al login.
   *
   * @param {{ name: string, email: string, password: string }} param0
   * @returns {Promise<object>} Usuario creado (sin contraseña)
   */
  // Registro de un nuevo usuario.
  async register({ name, email, password }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      throw AppError.conflict('El email ya está registrado');
    }
    const user = await UserModel.create({ name, email, password, role: 'user' });
    return sanitizeUser(user);
  },

  /**
   * Devuelve el perfil completo del usuario autenticado.
   * Se consulta de la BD (no del payload del token) para incluir campos actualizados.
   *
   * @param {number} userId
   * @returns {Promise<object>} Perfil del usuario (sin contraseña)
   */
  // Devuelve el perfil del usuario autenticado (para GET /api/auth/me).
  async getProfile(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw AppError.unauthorized('Usuario no encontrado');
    }
    return sanitizeUser(user);
  },

  /**
   * Valida credenciales y emite el par de tokens.
   * Usa el mismo mensaje "Credenciales inválidas" tanto para correo inexistente
   * como para contraseña incorrecta (anti-enumeración de usuarios).
   *
   * @param {{ email: string, password: string }} param0
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
   */
  // Login: valida credenciales y emite el par de tokens.
  async login({ email, password }) {
    const user = await UserModel.findByEmail(email);
    // Mismo mensaje para email inexistente o password incorrecta (anti-enumeración).
    if (!user) {
      throw AppError.unauthorized('Credenciales inválidas');
    }
    const ok = await UserModel.verifyPassword(password, user.password);
    if (!ok) {
      throw AppError.unauthorized('Credenciales inválidas');
    }
    return this.issueTokens(user);
  },

  /**
   * Genera el par access + refresh token y persiste el refresh en la BD.
   * El parámetro `executor` permite participar en una transacción externa
   * (usado durante la rotación para que el revoke + save sean atómicos).
   *
   * @param {object} user
   * @param {import('pg').Pool|import('pg').PoolClient} [executor=pool]
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
   */
  // Genera access + refresh y persiste el refresh (por su jti).
  // `executor` permite participar en una transaccion existente (ej. la rotacion).
  async issueTokens(user, executor = pool) {
    const jti = randomUUID();
    const accessToken = signAccessToken({ id: user.id, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id, role: user.role, jti });

    await RefreshTokenModel.save(
      {
        jti,
        userId: user.id,
        expiresAt: refreshExpiryDate(),
      },
      executor
    );

    return { accessToken, refreshToken, user: sanitizeUser(user) };
  },

  /**
   * Rota el refresh token de forma atómica.
   * Flujo:
   *   1. Verifica la firma del token recibido.
   *   2. Busca su jti en la BD.
   *   3. Si ya está revocado => reuso detectado => revoca TODAS las sesiones (seguridad).
   *   4. Si es válido => BEGIN; revoca el viejo; emite el nuevo; COMMIT.
   * La transacción ACID garantiza que no se pueda quedar sin tokens válidos si algo falla.
   *
   * @param {string} oldRefreshToken
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
   */
  // Rotación de refresh token: valida el actual, lo revoca y emite uno nuevo.
  // Si se detecta reuso de un token ya revocado, se cierran todas las sesiones.
  async refresh(oldRefreshToken) {
    if (!oldRefreshToken) {
      throw AppError.unauthorized('Refresh token ausente');
    }

    let payload;
    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch (_err) {
      throw AppError.unauthorized('Refresh token inválido o expirado');
    }

    const stored = await RefreshTokenModel.findByJti(payload.jti);
    if (!stored) {
      throw AppError.unauthorized('Sesión no reconocida');
    }

    // Reuso de un token revocado => posible robo. Revocamos todo por seguridad.
    if (stored.revoked) {
      await RefreshTokenModel.revokeAllForUser(payload.id);
      throw AppError.unauthorized('Sesión revocada. Vuelve a iniciar sesión.');
    }

    const user = await UserModel.findById(payload.id);
    if (!user) {
      throw AppError.unauthorized('Usuario no encontrado');
    }

    // Rotación atómica (ACID): revocar el token usado y emitir el nuevo ocurren
    // dentro de una misma transacción. Si algo falla, se revierte todo.
    return pool.withTransaction((client) =>
      RefreshTokenModel.revoke(payload.jti, client).then(() =>
        this.issueTokens(user, client)
      )
    );
  },

  /**
   * Revoca el refresh token actual sin lanzar error si ya es inválido.
   * El logout es idempotente: llamarlo varias veces no causa problemas.
   *
   * @param {string} [refreshToken]
   * @returns {Promise<void>}
   */
  // Logout: revoca el refresh token actual.
  async logout(refreshToken) {
    if (!refreshToken) return;
    try {
      const payload = verifyRefreshToken(refreshToken);
      await RefreshTokenModel.revoke(payload.jti);
    } catch (_err) {
      // Token inválido: no hay nada que revocar, logout idempotente.
    }
  },
};

module.exports = AuthService;
