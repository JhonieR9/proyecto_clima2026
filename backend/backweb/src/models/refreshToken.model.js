// backend/backweb/src/models/refreshToken.model.js
// Repositorio de refresh tokens para rotación y revocación de sesiones.
const pool = require('../config/db');

const RefreshTokenModel = {
  // Persiste un nuevo refresh token (por su jti) asociado a un usuario.
  async save({ jti, userId, expiresAt }) {
    await pool.query(
      `INSERT INTO refresh_tokens (jti, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [jti, userId, expiresAt]
    );
  },

  // Busca un token por su jti.
  async findByJti(jti) {
    const { rows } = await pool.query(
      'SELECT * FROM refresh_tokens WHERE jti = $1',
      [jti]
    );
    return rows[0] || null;
  },

  // Marca un token como revocado (usado en rotación y logout).
  async revoke(jti) {
    await pool.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE jti = $1',
      [jti]
    );
  },

  // Revoca TODAS las sesiones de un usuario (logout global / seguridad).
  async revokeAllForUser(userId) {
    await pool.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE',
      [userId]
    );
  },
};

module.exports = RefreshTokenModel;
