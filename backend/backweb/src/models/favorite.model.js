// backend/backweb/src/models/favorite.model.js
// ─────────────────────────────────────────────────────────
// Qué hace: Repositorio de favoritas en PostgreSQL. findByUser lista por usuario.
//           add hace upsert (ON CONFLICT) para evitar duplicados por usuario+ciudad.
//           remove borra solo si la favorita pertenece al usuario que la pide.
// Conectado con: db.js (pool de conexiones), favorite.controller.js (lo llama).
// Rol: Única capa con SQL de favoritas. El aislamiento por usuario está en las propias consultas.
const pool = require('../config/db');

const FavoriteModel = {
  // Lista las favoritas de un usuario (más recientes primero).
  async findByUser(userId) {
    const { rows } = await pool.query(
      `SELECT id, city, city_key, latitude, longitude, created_at
       FROM favorites
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  },

  // Agrega una favorita. Idempotente: si ya existe (mismo user + city_key),
  // no la duplica y devuelve la fila existente.
  async add({ userId, city, cityKey, latitude, longitude }) {
    const { rows } = await pool.query(
      `INSERT INTO favorites (user_id, city, city_key, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, city_key) DO UPDATE SET city = EXCLUDED.city
       RETURNING id, city, city_key, latitude, longitude, created_at`,
      [userId, city, cityKey, latitude, longitude]
    );
    return rows[0];
  },

  // Elimina una favorita del usuario por id (solo si le pertenece).
  async remove(userId, id) {
    const { rows } = await pool.query(
      'DELETE FROM favorites WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return rows[0] || null;
  },
};

module.exports = FavoriteModel;
