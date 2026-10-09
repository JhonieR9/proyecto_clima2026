// backend/backweb/src/controllers/weather.controller.js
const WeatherCache = require('../models/weatherCache.model');
const axios = require('axios'); // Asegúrate de que axios esté instalado en tu backend

const WeatherController = {
  async getWeather(req, res) {
    try {
      const { city } = req.query;

      if (!city) {
        return res.status(400).json({ error: 'El parámetro "city" es obligatorio.' });
      }

      // 1. Intentar obtener los datos desde nuestra caché local en PostgreSQL
      const cachedData = await WeatherCache.findByCity(city);

      if (cachedData && cachedData.length > 0) {
        // Si existe y tiene menos de 2 horas, devolvemos la caché con un header indicador
        return res.status(200).json({
          source: 'cache',
          data: cachedData[0]
        });
      }

      // 2. Si no está en caché, usamos la API gratuita de Open-Meteo
      // Primero: Convertimos el nombre de la ciudad a coordenadas usando la API de Geocoding de Open-Meteo
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`;
      const geoResponse = await axios.get(geoUrl);

      if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
        return res.status(404).json({ error: `No se encontraron coordenadas para la ciudad: ${city}` });
      }

      const { latitude, longitude, name: formattedCity } = geoResponse.data.results[0];

      // Segundo: Con las coordenadas obtenidas, consultamos el clima actual
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
      const weatherResponse = await axios.get(weatherUrl);

      const current = weatherResponse.data.current_weather;
      const temperature = current.temperature;
      const weatherCode = current.weathercode; // Código meteorológico de la WMO (ej: 0 = Despejado)

      // Convertimos el código a un texto legible de forma sencilla
      const conditionText = getWeatherDescription(weatherCode);

      // 3. Guardar los nuevos datos frescos en nuestra caché para las próximas 2 horas (Upsert)
      await WeatherCache.upsertWeather(formattedCity, latitude, longitude, temperature, conditionText);

      // 4. Responder al cliente de frontend con los datos frescos
      return res.status(200).json({
        source: 'api_fresh',
        data: {
          city: formattedCity,
          latitude,
          longitude,
          temperature,
          condition_text: conditionText
        }
      });

    } catch (error) {
      console.error('Error en WeatherController:', error);
      return res.status(500).json({ error: 'Error interno del servidor al procesar el clima.' });
    }
  }
};

// Función auxiliar simple para traducir los códigos meteorológicos de Open-Meteo
function getWeatherDescription(code) {
  const codes = {
    0: 'Despejado',
    1: 'Principalmente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Niebla', 48: 'Niebla con escarcha',
    51: 'Llovizna ligera', 53: 'Llovizna moderada', 55: 'Llovizna densa',
    61: 'Lluvia débil', 63: 'Lluvia moderada', 65: 'Lluvia fuerte',
    71: 'Nevada ligera', 73: 'Nevada moderada', 75: 'Nevada fuerte',
    80: 'Chubascos de lluvia débiles', 81: 'Chubascos de lluvia moderados', 82: 'Chubascos de lluvia violentos',
    95: 'Tormenta eléctrica'
  };
  return codes[code] || 'Condiciones cambiantes';
}

module.exports = WeatherController;
