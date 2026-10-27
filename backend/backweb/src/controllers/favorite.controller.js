// backend/backweb/src/controllers/favorite.controller.js
// Controlador de ciudades favoritas. Todas las operaciones son del usuario
// autenticado (req.user.id lo pone el middleware authenticate).
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
