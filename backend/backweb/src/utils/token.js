// backend/backweb/src/utils/token.js
// ─────────────────────────────────────────────────────────
// Qué hace: Firma y verifica los dos JWT del sistema de doble token.
//           signAccessToken: vida corta (15 min). signRefreshToken: vida larga (7 días) con jti.
//           Usa secretos distintos para cada tipo, configurables por variables de entorno.
// Conectado con: auth.middleware.js (verifica el access token en cada petición),
//               auth.service.js (firma los tokens en login y refresh).
// Rol: Capa criptográfica de tokens. Único lugar que conoce los secretos JWT.
const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

/**
 * Access token: vida corta. El frontend lo guarda SOLO en memoria (no en
 * localStorage) y lo envía en el header Authorization: Bearer <token>.
 * @param {{ id: number, role: string }} payload
 */
function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

/**
 * Refresh token: vida larga. Viaja en cookie HttpOnly/Secure/SameSite=Strict.
 * Incluye un `jti` (JWT ID) para poder rotarlo y revocarlo en BD.
 * @param {{ id: number, role: string, jti: string }} payload
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

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
