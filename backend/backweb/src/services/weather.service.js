// backend/backweb/src/services/weather.service.js
// Capa de SERVICIO del clima. Implementa la estrategia de caching prometida:
//   - L1: caché en memoria (Map) -> cero latencia en hits calientes.
//   - L2: caché en PostgreSQL (tabla weather_cache).
//   - Stale-While-Revalidate: sirve dato "stale" al instante y refresca en 2º plano.
//   - Tolerancia a caídas: si Open-Meteo falla, se devuelve el último dato conocido.
const axios = require('axios');
const WeatherCache = require('../models/weatherCache.model');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const TaskQueue = require('../utils/taskQueue');

// Cola en memoria para las revalidaciones en segundo plano (patrón SWR).
// Concurrencia 2: no saturamos a Open-Meteo aunque lleguen muchas peticiones stale.
const revalidationQueue = new TaskQueue({
  name: 'weather-revalidation',
  concurrency: 2,
  maxRetries: 2,
  baseDelayMs: 1000,
});

// --- Umbrales de frescura (Stale-While-Revalidate) ---
const FRESH_MS = 30 * 60 * 1000;        // < 30 min: dato fresco, se sirve directo
const STALE_MS = 24 * 60 * 60 * 1000;   // 30 min a 24 h: se sirve y se revalida

// Normaliza el nombre de ciudad a una clave de caché estable: minúsculas, sin
// acentos y sin espacios sobrantes. Así "Bogota", "bogotá" y "  BOGOTÁ " caen
// todas en la misma entrada de caché (L1 y L2).
function cityKeyOf(city) {
  return city
    .normalize('NFD')               // separa letra y acento
    .replace(/[\u0300-\u036f]/g, '') // elimina los diacríticos
    .trim()
    .toLowerCase();
}

// --- L1: caché en memoria del proceso Node ---
const memoryCache = new Map(); // key: cityKey -> { data, cachedAt }
const L1_TTL_MS = FRESH_MS;

function l1Get(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > L1_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function l1Set(key, data) {
  memoryCache.set(key, { data, cachedAt: Date.now() });
}

// Traduce el weathercode de la WMO a texto legible.
function getWeatherDescription(code) {
  const codes = {
    0: 'Despejado',
    1: 'Principalmente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Niebla', 48: 'Niebla con escarcha',
    51: 'Llovizna ligera', 53: 'Llovizna moderada', 55: 'Llovizna densa',
    61: 'Lluvia débil', 63: 'Lluvia moderada', 65: 'Lluvia fuerte',
    71: 'Nevada ligera', 73: 'Nevada moderada', 75: 'Nevada fuerte',
    80: 'Chubascos de lluvia débiles', 81: 'Chubascos de lluvia moderados', 82: 'Chubascos de lluvia violentos',
    95: 'Tormenta eléctrica',
  };
  return codes[code] || 'Condiciones cambiantes';
}

// Llama a Open-Meteo (geocoding + forecast) y devuelve datos normalizados.
async function fetchFromApi(city, correlationId) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`;
  const geoResponse = await axios.get(geoUrl, { timeout: 5000 });

  if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
    throw AppError.notFound(`No se encontraron coordenadas para la ciudad: ${city}`);
  }

  const { latitude, longitude, name: formattedCity } = geoResponse.data.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
  const weatherResponse = await axios.get(weatherUrl, { timeout: 5000 });

  const current = weatherResponse.data.current_weather;
  const data = {
    city: formattedCity,
    latitude,
    longitude,
    temperature: current.temperature,
    condition_text: getWeatherDescription(current.weathercode),
  };

  logger.info('weather.api_fetch', { correlationId, city: formattedCity });
  return data;
}

// Persiste en L2 (Postgres) y refresca L1. Usa la clave normalizada de la
// ciudad consultada para que la caché acierte sin importar acentos.
async function persist(city, data) {
  const key = cityKeyOf(city);
  await WeatherCache.upsertWeather(
    key, data.city, data.latitude, data.longitude, data.temperature, data.condition_text
  );
  l1Set(key, data);
}

const WeatherService = {
  /**
   * Devuelve el clima de una ciudad aplicando la estrategia de caching multinivel.
   * @returns {Promise<{ source: string, data: object }>}
   */
  async getWeather(city, correlationId) {
    const key = cityKeyOf(city);

    // --- L1: memoria ---
    const fromMemory = l1Get(key);
    if (fromMemory) {
      return { source: 'memory', data: fromMemory };
    }

    // --- L2: PostgreSQL ---
    const cached = await WeatherCache.findByKey(key); // trae la fila aunque esté vieja
    if (cached) {
      const ageMs = Date.now() - new Date(cached.updated_at).getTime();

      // Normaliza tipos NUMERIC de Postgres (vienen como string).
      const data = {
        city: cached.city,
        latitude: Number(cached.latitude),
        longitude: Number(cached.longitude),
        temperature: Number(cached.temperature),
        condition_text: cached.condition_text,
      };

      // FRESH: servir directo y poblar L1.
      if (ageMs <= FRESH_MS) {
        l1Set(key, data);
        return { source: 'cache', data };
      }

      // STALE: servir YA y revalidar en segundo plano (no bloquea la respuesta).
      if (ageMs <= STALE_MS) {
        this.revalidateInBackground(city, correlationId);
        return { source: 'stale', data };
      }
    }

    // --- EXPIRADO o sin caché: hay que ir a la API ---
    try {
      const fresh = await fetchFromApi(city, correlationId);
      await persist(city, fresh);
      return { source: 'api_fresh', data: fresh };
    } catch (err) {
      // Tolerancia a caídas: si la API falla pero tenemos un dato viejo, lo servimos.
      if (cached) {
        logger.warn('weather.api_failed_serving_stale', {
          correlationId, city, reason: err.message,
        });
        return {
          source: 'stale_fallback',
          data: {
            city: cached.city,
            latitude: Number(cached.latitude),
            longitude: Number(cached.longitude),
            temperature: Number(cached.temperature),
            condition_text: cached.condition_text,
          },
        };
      }
      // Si es un error de negocio (404 ciudad no encontrada), se propaga tal cual.
      if (err instanceof AppError) throw err;
      // Sin dato previo y API caída => 503.
      throw new AppError(503, 'Servicio meteorológico no disponible', 'WEATHER_UNAVAILABLE');
    }
  },

  // Refresco en segundo plano para el patrón Stale-While-Revalidate.
  // Encola la revalidación en la cola de tareas: así se limita la concurrencia,
  // se de-duplican peticiones de la misma ciudad y se reintenta ante fallos.
  revalidateInBackground(city, correlationId) {
    const key = cityKeyOf(city);
    revalidationQueue.enqueue(
      key,
      async () => {
        const fresh = await fetchFromApi(city, correlationId);
        await persist(city, fresh);
        logger.info('weather.revalidated', { correlationId, city });
      },
      { correlationId }
    );
  },

  // Expuesto para health checks / pruebas: estado de la cola de revalidación.
  getRevalidationQueueStats() {
    return revalidationQueue.stats();
  },
};

module.exports = WeatherService;
