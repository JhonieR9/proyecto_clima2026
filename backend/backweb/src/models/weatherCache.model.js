// backend/backweb/src/models/weatherCache.model.js
// Repositorio del caché de clima (L2 en PostgreSQL).
// Nota: la decisión de "fresco vs stale" vive en la capa de servicio
// (Stale-While-Revalidate), por eso aquí devolvemos la fila SIN filtrar por edad.
const pool = require('../config/db');

const WeatherCache = {
  // Devuelve la última fila guardada para la ciudad (sin importar su antigüedad).
  // El servicio decide si está fresca, stale o expirada usando updated_at.
  async findByCity(city) {
    const query = `
      SELECT city, latitude, longitude, temperature, condition_text, updated_at
      FROM weather_cache
      WHERE LOWER(city) = LOWER($1)
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [city]);
    return rows[0] || null;
  },

  // Inserta o actualiza el clima de una ciudad (Upsert).
  async upsertWeather(city, latitude, longitude, temperature, conditionText) {
    const query = `
      INSERT INTO weather_cache (city, latitude, longitude, temperature, condition_text, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (city)
      DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        temperature = EXCLUDED.temperature,
        condition_text = EXCLUDED.condition_text,
        updated_at = NOW();
    `;
    const values = [city, latitude, longitude, temperature, conditionText];
    await pool.query(query, values);
  },
};

module.exports = WeatherCache;
