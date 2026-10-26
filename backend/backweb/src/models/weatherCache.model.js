// backend/backweb/src/models/weatherCache.model.js
// Repositorio del caché de clima (L2 en PostgreSQL).
// Nota: la decisión de "fresco vs stale" vive en la capa de servicio
// (Stale-While-Revalidate), por eso aquí devolvemos la fila SIN filtrar por edad.
//
// La búsqueda y el upsert se hacen por `city_key`: una clave normalizada
// (minúsculas y sin acentos) que calcula el servicio. Así "Bogota" y "Bogotá"
// resuelven a la MISMA fila y la caché acierta aunque el usuario no ponga tildes.
const pool = require('../config/db');

const WeatherCache = {
  // Devuelve la última fila guardada para la clave normalizada de la ciudad.
  // El servicio decide si está fresca, stale o expirada usando updated_at.
  async findByKey(cityKey) {
    const query = `
      SELECT city, city_key, latitude, longitude, temperature, condition_text, updated_at
      FROM weather_cache
      WHERE city_key = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [cityKey]);
    return rows[0] || null;
  },

  // Inserta o actualiza el clima de una ciudad (Upsert por city_key).
  async upsertWeather(cityKey, city, latitude, longitude, temperature, conditionText) {
    const query = `
      INSERT INTO weather_cache (city_key, city, latitude, longitude, temperature, condition_text, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (city_key)
      DO UPDATE SET
        city = EXCLUDED.city,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        temperature = EXCLUDED.temperature,
        condition_text = EXCLUDED.condition_text,
        updated_at = NOW();
    `;
    const values = [cityKey, city, latitude, longitude, temperature, conditionText];
    await pool.query(query, values);
  },
};

module.exports = WeatherCache;
