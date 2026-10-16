// backend/backweb/src/routes/weather.routes.js
const express = require('express');
const router = express.Router();
const WeatherController = require('../controllers/weather.controller');
const validate = require('../middlewares/validate.middleware');
const { weatherQuerySchema } = require('../validators/weather.schema');

/**
 * @swagger
 * /api/weather:
 *   get:
 *     summary: Consulta el clima actual de una ciudad (con caché multinivel + SWR)
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema: { type: string }
 *         example: Bogota
 *     responses:
 *       200:
 *         description: Clima de la ciudad. 'source' indica el origen del dato.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 source:
 *                   type: string
 *                   enum: [memory, cache, stale, api_fresh, stale_fallback]
 *                 data:
 *                   type: object
 *       400: { description: Parámetro city inválido }
 *       404: { description: Ciudad no encontrada }
 *       503: { description: Servicio meteorológico no disponible }
 */
router.get('/', validate(weatherQuerySchema, 'query'), WeatherController.getWeather);

module.exports = router;
