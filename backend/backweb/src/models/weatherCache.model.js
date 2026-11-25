// backend/backweb/src/models/weatherCache.model.js
// ─────────────────────────────────────────────────────────
// Qué hace: Repositorio del caché de clima en PostgreSQL (L2). findByKey busca por la
//           clave normalizada city_key sin filtrar por antigüedad (el servicio decide).
//           upsertWeather inserta o actualiza con ON CONFLICT para mantener un registro por ciudad.
// Conectado con: db.js (pool de conexiones), weather.service.js (lee y escribe el caché L2).
// Rol: Caché de segundo nivel. Persiste los datos del clima entre reinicios del servidor.
const pool = require('../config/db');

const WeatherCache = {
  // Devuelve la última fila guardada para la clave normalizada de la ciudad.
  // El servicio decide si está fresca, stale o expirada usando updated_at.
  async findByKey(cityKey) {
    const query = `
      SELECT city, city_key, latitude, longitude, temperature, humidity, condition_text, updated_at
      FROM weather_cache
      WHERE city_key = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [cityKey]);
    return rows[0] || null;
  },

  // Inserta o actualiza el clima de una ciudad (Upsert por city_key).
  async upsertWeather(cityKey, city, latitude, longitude, temperature, conditionText, humidity) {
    const query = `
      INSERT INTO weather_cache (city_key, city, latitude, longitude, temperature, condition_text, humidity, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (city_key)
      DO UPDATE SET
        city = EXCLUDED.city,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        temperature = EXCLUDED.temperature,
        condition_text = EXCLUDED.condition_text,
        humidity = EXCLUDED.humidity,
        updated_at = NOW();
    `;
    const values = [cityKey, city, latitude, longitude, temperature, conditionText, humidity ?? null];
    await pool.query(query, values);
  },
};

module.exports = WeatherCache;
