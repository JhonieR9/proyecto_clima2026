// backend/backweb/src/models/favorite.model.js
// ─────────────────────────────────────────────────────────
// Qué hace: Repositorio de favoritas en PostgreSQL. findByUser lista por usuario.
//           add hace upsert (ON CONFLICT) para evitar duplicados por usuario+ciudad.
//           remove borra solo si la favorita pertenece al usuario que la pide.
// Conectado con: db.js (pool de conexiones), favorite.controller.js (lo llama).
// Rol: Única capa con SQL de favoritas. El aislamiento por usuario está en las propias consultas.
const pool = require('../config/db');

const FavoriteModel = {
  /**
   * Devuelve todas las ciudades favoritas de un usuario, ordenadas de más reciente a más antigua.
   * El ORDER BY created_at DESC asegura que las últimas agregadas aparecen primero en la UI.
   *
   * @param {number} userId
   * @returns {Promise<Array<{id,city,city_key,latitude,longitude,created_at}>>}
   */
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

  /**
   * Agrega una ciudad a favoritas de forma idempotente.
   * ON CONFLICT (user_id, city_key) evita duplicados sin lanzar un error:
   * si la ciudad ya existe, actualiza el nombre visual (city) por si cambió
   * la capitalización y devuelve la fila resultante.
   *
   * @param {{ userId: number, city: string, cityKey: string, latitude: number|null, longitude: number|null }} param0
   * @returns {Promise<{id,city,city_key,latitude,longitude,created_at}>}
   */
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

  /**
   * Elimina una favorita verificando que pertenece al usuario que la solicita.
   * La condición AND user_id = $2 en el WHERE impide que un usuario borre favoritas ajenas.
   * Devuelve null si no existe o no le pertenece (el controlador lo convierte en 404).
   *
   * @param {number} userId  Usuario autenticado
   * @param {number} id      ID de la favorita a eliminar
   * @returns {Promise<{id: number}|null>}
   */
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
