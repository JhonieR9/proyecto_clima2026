// backend/backweb/src/controllers/favorite.controller.js
// ─────────────────────────────────────────────────────────
// Qué hace: Recibe las peticiones de favoritas y las delega al modelo.
//           Usa req.user.id (del middleware authenticate) para aislar cada usuario.
//           Al agregar, calcula la clave normalizada con cityKeyOf para evitar duplicados.
// Conectado con: favorite.model.js, weather.service.js (cityKeyOf), AppError.js, favorite.routes.js.
// Rol: Controlador HTTP de favoritas. Garantiza el aislamiento entre usuarios.
const FavoriteModel = require('../models/favorite.model');
const WeatherService = require('../services/weather.service');
const AppError = require('../utils/AppError');

const FavoriteController = {
  // GET /api/favorites
  async list(req, res, next) {
    try {
      const favorites = await FavoriteModel.findByUser(req.user.id);
      res.json({ success: true, data: favorites });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/favorites  { city, latitude?, longitude? }
  async add(req, res, next) {
    try {
      const { city, latitude, longitude } = req.body; // validado por Zod
      const cityKey = WeatherService.cityKeyOf(city);

      const fav = await FavoriteModel.add({
        userId: req.user.id,
        city: city.trim(),
        cityKey,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      });

      res.status(201).json({ success: true, data: fav });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/favorites/:id
  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        throw AppError.badRequest('id inválido');
      }
      const deleted = await FavoriteModel.remove(req.user.id, id);
      if (!deleted) {
        throw AppError.notFound('Favorita no encontrada');
      }
      res.json({ success: true, message: 'Favorita eliminada' });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = FavoriteController;
