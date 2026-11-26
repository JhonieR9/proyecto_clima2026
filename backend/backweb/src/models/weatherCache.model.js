// backend/backweb/src/models/weatherCache.model.js
// ─────────────────────────────────────────────────────────
// Qué hace: Repositorio del caché de clima en PostgreSQL (L2). findByKey busca por la
//           clave normalizada city_key sin filtrar por antigüedad (el servicio decide).
//           upsertWeather inserta o actualiza con ON CONFLICT para mantener un registro por ciudad.
// Conectado con: db.js (pool de conexiones), weather.service.js (lee y escribe el caché L2).
// Rol: Caché de segundo nivel. Persiste los datos del clima entre reinicios del servidor.
const pool = require('../config/db');

const WeatherCache = {
  /**
   * Devuelve la fila de caché de una ciudad, sin importar su antigüedad.
   * El servicio de clima (weather.service.js) es quien decide qué hacer con el dato
   * según su campo updated_at: servirlo fresco, stale o ignorarlo para ir a la API.
   * Esta separación de responsabilidades facilita testear la lógica de frescura.
   *
   * @param {string} cityKey  Clave normalizada (minúsculas, sin acentos)
   * @returns {Promise<object|null>}
   */
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

  /**
   * Inserta o actualiza el clima de una ciudad (upsert por city_key).
   * ON CONFLICT (city_key) DO UPDATE garantiza que haya exactamente una fila por
   * ciudad y que updated_at siempre refleje el momento de la última actualización,
   * que es el campo que el servicio usa para calcular la antigüedad del dato.
   * NOW() se ejecuta en la BD para evitar desfases de reloj entre el servidor Node
   * y PostgreSQL.
   *
   * @param {string}      cityKey       Clave normalizada (minúsculas, sin acentos)
   * @param {string}      city          Nombre del municipio formateado por Open-Meteo
   * @param {number}      latitude
   * @param {number}      longitude
   * @param {number}      temperature   Temperatura en °C
   * @param {string}      conditionText Descripción textual de la condición WMO
   * @param {number|null} humidity      Humedad relativa en % (null si no disponible)
   * @returns {Promise<void>}
   */
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
