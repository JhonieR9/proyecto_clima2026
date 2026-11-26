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
  /**
   * Devuelve todas las ciudades favoritas del usuario autenticado, en orden
   * de creación descendente (las más recientes primero).
   * El aislamiento por usuario viene de pasar req.user.id a la query SQL.
   *
   * @param {import('express').Request}  req  - req.user.id inyectado por authenticate
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  // GET /api/favorites
  async list(req, res, next) {
    try {
      const favorites = await FavoriteModel.findByUser(req.user.id);
      res.json({ success: true, data: favorites });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Agrega una ciudad a las favoritas del usuario autenticado.
   * Calcula la clave normalizada (cityKeyOf) para que "Bogotá" y "bogota" sean
   * la misma favorita. El modelo usa ON CONFLICT, así que si ya existe la devuelve
   * en vez de lanzar un error.
   *
   * @param {import('express').Request}  req  - req.body: { city, latitude?, longitude? }
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
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

  /**
   * Elimina una favorita por su ID, solo si pertenece al usuario autenticado.
   * El modelo aplica WHERE id = $1 AND user_id = $2, así que un usuario no puede
   * borrar las favoritas de otro incluso si adivina el ID.
   *
   * @param {import('express').Request}  req  - req.params.id: ID de la favorita a eliminar
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
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
