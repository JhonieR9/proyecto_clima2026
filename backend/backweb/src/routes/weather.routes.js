// backend/backweb/src/routes/weather.routes.js
const express = require('express');
const router = express.Router();
const WeatherController = require('../controllers/weather.controller');

// Definimos la ruta GET para consultar el clima de una ciudad
router.get('/', WeatherController.getWeather);

module.exports = router;
