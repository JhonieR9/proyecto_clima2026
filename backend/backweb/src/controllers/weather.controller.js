// backend/backweb/src/controllers/weather.controller.js
// Controlador de clima: delega la lógica en WeatherService y traduce HTTP.
const WeatherService = require('../services/weather.service');

const WeatherController = {
  // GET /api/weather?city=...
  async getWeather(req, res, next) {
    try {
      // req.query.city ya viene validado y saneado por el middleware Zod.
      const { city } = req.query;
      const result = await WeatherService.getWeather(city, req.correlationId);

      // Cache-Control para que el navegador también cachee la respuesta.
      res.set('Cache-Control', 'public, max-age=1800'); // 30 min
      res.status(200).json(result);
    } catch (err) {
      next(err); // lo maneja el error handler global
    }
  },

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
