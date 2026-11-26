// backend/backweb/src/controllers/weather.controller.js
// ─────────────────────────────────────────────────────────
// Qué hace: Recibe las peticiones de clima y autocompletado y las delega al servicio.
//           Añade Cache-Control de 15 min al clima (alineado con FRESH_MS del servidor)
//           y de 5 min al autocompletado para que el navegador también cachee.
// Conectado con: weather.service.js (delega la lógica de caché y Open-Meteo), weather.routes.js.
// Rol: Único archivo que toca las cabeceras HTTP del clima.
const WeatherService = require('../services/weather.service');

const WeatherController = {
  /**
   * Devuelve el clima actual de la ciudad recibida en query.
   * El campo `source` del resultado indica de dónde vino el dato:
   *   memory / cache / stale / api_fresh / stale_fallback.
   * La cabecera Cache-Control se alinea con FRESH_MS (15 min) para evitar que el
   * navegador cachee más tiempo del que el servidor considera "fresco".
   *
   * @param {import('express').Request}  req  - req.query.city validado por Zod
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  // GET /api/weather?city=...
  async getWeather(req, res, next) {
    try {
      // req.query.city ya viene validado y saneado por el middleware Zod.
      const { city } = req.query;
      const result = await WeatherService.getWeather(city, req.correlationId);

      // Cache-Control alineado con FRESH_MS del servidor (15 min).
      // Sin esto el navegador podría cachear 30 min y ocultar cambios del caché del servidor.
      res.set('Cache-Control', 'public, max-age=900'); // 15 min
      res.status(200).json(result);
    } catch (err) {
      next(err); // lo maneja el error handler global
    }
  },

  /**
   * Devuelve sugerencias de ciudades para el autocompletado del frontend.
   * Tiempo de caché en cliente: 5 min (menos que el clima porque el catálogo
   * de ciudades cambia poco, pero queremos resultados actualizados en la UI).
   *
   * @param {import('express').Request}  req  - req.query.q validado por Zod
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  // GET /api/weather/suggest?q=...  (autocompletado de ciudades)
  async suggest(req, res, next) {
    try {
      const { q } = req.query; // validado por Zod
      const suggestions = await WeatherService.suggestCities(q, req.correlationId);
      res.set('Cache-Control', 'public, max-age=300'); // 5 min
      res.status(200).json({ success: true, data: suggestions });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = WeatherController;
