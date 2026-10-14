// backend/src/models/weatherCache.model.js

// Asumiendo que tu archivo db.js exporta la instancia del cliente o pool de pg
const pool = require('../config/db'); 

const WeatherCache = {
  // 1. Buscar si ya tenemos el clima guardado y vigente para una ciudad
  async findByCity(city) {
    const query = `
      SELECT * FROM weather_cache 
      WHERE LOWER(city) = LOWER($1) 
        AND updated_at >= NOW() - INTERVAL '2 hours'
      LIMIT 1;
    `;
    const { rows } = await pool.query(query, [city]);
    return rows[0] || null;
  },

  // 2. Guardar o actualizar el clima de una ciudad (Estrategia Upsert)
  async upsertWeather(city, latitude, longitude, temperature, conditionText) {
    const query = `
      INSERT INTO weather_cache (city, latitude, longitude, temperature, condition_text, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (LOWER(city)) 
      DO UPDATE SET 
        temperature = EXCLUDED.temperature,
        condition_text = EXCLUDED.condition_text,
        updated_at = NOW();
    `;
    const values = [city, latitude, longitude, temperature, conditionText];
    await pool.query(query, values);
  }
};

module.exports = WeatherCache;
