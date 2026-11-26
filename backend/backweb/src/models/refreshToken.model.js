// backend/backweb/src/models/refreshToken.model.js
// ─────────────────────────────────────────────────────────
// Qué hace: Repositorio de refresh tokens. Guarda, busca por jti, revoca un token individual
//           y revoca todos los de un usuario. Acepta un executor opcional para participar en
//           transacciones ACID. La columna revoked permite invalidar sesiones sin borrarlas.
// Conectado con: db.js (pool de conexiones), auth.service.js (login, refresh y logout).
// Rol: Persistencia de la rotación de tokens. Detecta el reuso de tokens robados.
const pool = require('../config/db');

// Cada método acepta un `executor` opcional (cliente de transacción). Si no se
// pasa, usa el pool directamente. Esto permite agrupar varias operaciones en una
// sola transacción ACID (ej. la rotación de tokens: revocar + emitir nuevo).
const RefreshTokenModel = {
  /**
   * Persiste un nuevo refresh token asociando su jti al usuario.
   * El jti (JWT ID) es el identificador único que se busca en las consultas posteriores;
   * guardar el hash no es necesario aquí porque el token viaja en cookie HttpOnly.
   *
   * @param {{ jti: string, userId: number, expiresAt: Date }} param0
   * @param {import('pg').Pool|import('pg').PoolClient} [executor=pool]
   * @returns {Promise<void>}
   */
  // Persiste un nuevo refresh token (por su jti) asociado a un usuario.
  async save({ jti, userId, expiresAt }, executor = pool) {
    await executor.query(
      `INSERT INTO refresh_tokens (jti, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [jti, userId, expiresAt]
    );
  },

  /**
   * Busca un token por su jti para verificar si existe y si está revocado.
   * El servicio de auth lo usa para detectar reuso (token robado y ya rotado).
   *
   * @param {string} jti
   * @param {import('pg').Pool|import('pg').PoolClient} [executor=pool]
   * @returns {Promise<object|null>}
   */
  // Busca un token por su jti.
  async findByJti(jti, executor = pool) {
    const { rows } = await executor.query(
      'SELECT * FROM refresh_tokens WHERE jti = $1',
      [jti]
    );
    return rows[0] || null;
  },

  /**
   * Marca un token como revocado (revoked = TRUE).
   * Se llama durante la rotación (el token viejo se invalida) y durante el logout.
   * No borra la fila: conservarla permite auditar qué tokens se usaron.
   *
   * @param {string} jti
   * @param {import('pg').Pool|import('pg').PoolClient} [executor=pool]
   * @returns {Promise<void>}
   */
  // Marca un token como revocado (usado en rotación y logout).
  async revoke(jti, executor = pool) {
    await executor.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE jti = $1',
      [jti]
    );
  },

  /**
   * Revoca TODOS los tokens activos de un usuario.
   * Se llama cuando se detecta reuso de un token ya revocado, lo que indica
   * que alguien puede tener una copia del token: invalidar todo es la respuesta
   * más segura para forzar un nuevo login.
   *
   * @param {number} userId
   * @param {import('pg').Pool|import('pg').PoolClient} [executor=pool]
   * @returns {Promise<void>}
   */
  // Revoca TODAS las sesiones de un usuario (logout global / seguridad).
  async revokeAllForUser(userId, executor = pool) {
    await executor.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE',
      [userId]
    );
  },
};

module.exports = RefreshTokenModel;
