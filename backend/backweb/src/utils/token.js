// backend/backweb/src/utils/token.js
// ─────────────────────────────────────────────────────────
// Qué hace: Firma y verifica los dos JWT del sistema de doble token.
//           signAccessToken: vida corta (15 min). signRefreshToken: vida larga (7 días) con jti.
//           Usa secretos distintos para cada tipo, configurables por variables de entorno.
// Conectado con: auth.middleware.js (verifica el access token en cada petición),
//               auth.service.js (firma los tokens en login y refresh).
// Rol: Capa criptográfica de tokens. Único lugar que conoce los secretos JWT.
const jwt = require('jsonwebtoken');

// Secretos distintos para access y refresh para que un refresh token comprometido
// no pueda usarse como access token y viceversa.
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

// Duración de cada token. El access es corto para limitar la ventana de ataque
// si se filtra (p. ej. en logs). El refresh es largo para evitar re-logins frecuentes.
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

/**
 * Firma un access token de vida corta.
 * El cliente lo guarda SOLO en memoria (no en localStorage) para mitigar XSS.
 * Se envía en el header Authorization: Bearer <token> en cada petición protegida.
 *
 * @param {{ id: number, role: string }} payload
 * @returns {string}
 */
function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

/**
 * Firma un refresh token de vida larga.
 * Viaja en cookie HttpOnly/Secure/SameSite=Strict, inaccesible desde JS.
 * Incluye el campo `jti` (JWT ID) para que el servidor lo busque en la BD
 * y pueda rotarlo o revocarlo sin necesidad de invalidar el secreto.
 *
 * @param {{ id: number, role: string, jti: string }} payload
 * @returns {string}
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

/**
 * Verifica la firma y la fecha de expiración de un access token.
 * Lanza JsonWebTokenError si es inválido o TokenExpiredError si caducó.
 *
 * @param {string} token
 * @returns {{ id: number, role: string, iat: number, exp: number }}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Verifica la firma y la fecha de expiración de un refresh token.
 * El servicio de auth llama a esto antes de buscar el jti en la BD.
 *
 * @param {string} token
 * @returns {{ id: number, role: string, jti: string, iat: number, exp: number }}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  REFRESH_EXPIRES,
};
