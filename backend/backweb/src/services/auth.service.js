// backend/backweb/src/services/auth.service.js
// Capa de SERVICIO de autenticación. CORE: "Arquitectura Limpia por capas
// (Controladores, Servicios, Repositorios)". Aquí vive la lógica de negocio;
// el controlador solo traduce HTTP <-> servicio.
const { randomUUID } = require('crypto');
const UserModel = require('../models/user.model');
const RefreshTokenModel = require('../models/refreshToken.model');
const AppError = require('../utils/AppError');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/token');

// Quita el campo password antes de devolver un usuario al exterior.
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

// Calcula la fecha de expiración del refresh token para persistirla.
function refreshExpiryDate() {
  const days = parseInt(process.env.JWT_REFRESH_EXPIRES || '7d', 10) || 7;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const AuthService = {
  // Registro de un nuevo usuario.
  async register({ name, email, password }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      throw AppError.conflict('El email ya está registrado');
    }
    const user = await UserModel.create({ name, email, password, role: 'user' });
    return sanitizeUser(user);
  },

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

  // Genera access + refresh y persiste el refresh (por su jti).
  async issueTokens(user) {
    const jti = randomUUID();
    const accessToken = signAccessToken({ id: user.id, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id, role: user.role, jti });

    await RefreshTokenModel.save({
      jti,
      userId: user.id,
      expiresAt: refreshExpiryDate(),
    });

    return { accessToken, refreshToken, user: sanitizeUser(user) };
  },

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

    // Rotación: invalidamos el token usado y emitimos uno nuevo.
    await RefreshTokenModel.revoke(payload.jti);

    const user = await UserModel.findById(payload.id);
    if (!user) {
      throw AppError.unauthorized('Usuario no encontrado');
    }
    return this.issueTokens(user);
  },

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
