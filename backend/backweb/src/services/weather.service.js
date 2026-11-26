// backend/backweb/src/services/weather.service.js
// ─────────────────────────────────────────────────────────
// Qué hace: Implementa caché multinivel (L1 memoria + L2 PostgreSQL) con Stale-While-Revalidate.
//           Decide de dónde viene el dato: memory, cache, stale, api_fresh, stale_fallback o 503.
//           Las revalidaciones se encolan en taskQueue. Implementa el autocompletado con
//           priorización de Colombia.
// Conectado con: weatherCache.model.js, AppError.js, logger.js, taskQueue.js,
//               weather.controller.js, favorite.controller.js, weather.logic.test.js.
// Rol: Archivo con más lógica del proyecto. El sistema de caché es el núcleo académico del trabajo.
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
// Open-Meteo actualiza el clima actual cada 15 min, así que no tiene sentido
// considerar "fresco" un dato más viejo que eso.
const FRESH_MS = 15 * 60 * 1000;        // < 15 min: dato fresco, se sirve directo
const STALE_MS = 24 * 60 * 60 * 1000;   // 15 min a 24 h: se sirve y se revalida

/**
 * Normaliza el nombre de ciudad a una clave de caché estable.
 * Convierte a minúsculas, elimina diacríticos (tildes, ñ) y recorta espacios.
 * Así "Bogota", "bogotá" y "  BOGOTÁ " caen en la misma entrada de caché.
 * También se usa al guardar favoritas para garantizar de-duplicación coherente.
 *
 * @param {string} city
 * @returns {string}  clave normalizada (ej. 'bogota', 'medellin')
 */
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

/**
 * Reordena sugerencias de ciudades poniendo Colombia al inicio.
 * El sort es estable: el orden relativo dentro de cada grupo se conserva.
 * Función pura (sin red ni estado externo) para poder testearla de forma aislada.
 *
 * @param {Array<{name:string, country:string, country_code?:string}>} results
 * @returns {Array}
 */
// Ordena las sugerencias del geocoding poniendo Colombia primero, manteniendo
// el orden de relevancia original dentro de cada grupo (sort estable).
// Función pura (sin red) para poder testearla aislada.
function orderSuggestions(results) {
  const isCO = (r) => r.country_code === 'CO' || r.country === 'Colombia';
  return [...results].sort((a, b) => Number(isCO(b)) - Number(isCO(a)));
}

// --- L1: caché en memoria del proceso Node ---
const memoryCache = new Map(); // key: cityKey -> { data, cachedAt }

// TTL del caché en memoria igual al umbral de frescura: si el dato está en L1
// es porque llegó de la API hace menos de 15 min, así que siempre es fresco.
const L1_TTL_MS = FRESH_MS;

/**
 * Lee del caché L1 (memoria). Si la entrada existe pero ha caducado, la elimina.
 *
 * @param {string} key
 * @returns {object|null}
 */
function l1Get(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > L1_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Escribe en el caché L1 (memoria) marcando el instante de guardado.
 *
 * @param {string} key
 * @param {object} data
 */
function l1Set(key, data) {
  memoryCache.set(key, { data, cachedAt: Date.now() });
}

/**
 * Convierte un código WMO (World Meteorological Organization) en texto en español.
 * Los códigos están definidos en: https://open-meteo.com/en/docs#weathervariables
 * Se devuelve 'Condiciones cambiantes' para cualquier código no mapeado.
 *
 * @param {number} code  Código WMO del tiempo actual
 * @returns {string}
 */
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

/**
 * Llama a la API de Open-Meteo (geocoding + forecast) y devuelve los datos normalizados.
 * Primero obtiene las coordenadas del nombre de ciudad y luego el pronóstico para esas coords.
 * Timeout de 5 s en cada llamada para no bloquear la petición del usuario.
 *
 * @param {string} city          Nombre de la ciudad a consultar
 * @param {string} correlationId Para rastrear la petición en los logs
 * @returns {Promise<{city,latitude,longitude,temperature,humidity,condition_text}>}
 */
// Llama a Open-Meteo (geocoding + forecast) y devuelve datos normalizados.
async function fetchFromApi(city, correlationId) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`;
  const geoResponse = await axios.get(geoUrl, { timeout: 5000 });

  if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
    throw AppError.notFound(`No se encontraron coordenadas para la ciudad: ${city}`);
  }

  const { latitude, longitude, name: formattedCity } = geoResponse.data.results[0];

  // `current` permite pedir variables concretas, incluida la humedad relativa.
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
  const weatherResponse = await axios.get(weatherUrl, { timeout: 5000 });

  const current = weatherResponse.data.current;
  const data = {
    city: formattedCity,
    latitude,
    longitude,
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m ?? null,
    condition_text: getWeatherDescription(current.weather_code),
  };

  logger.info('weather.api_fetch', { correlationId, city: formattedCity });
  return data;
}

/**
 * Convierte una fila de la tabla weather_cache al formato de respuesta de la API.
 * Los campos NUMERIC de PostgreSQL llegan como string; Number() los convierte.
 *
 * @param {object} row  Fila de la tabla weather_cache
 * @returns {{ city, latitude, longitude, temperature, humidity, condition_text }}
 */
// Convierte una fila de weather_cache al formato que devuelve la API.
// Normaliza los NUMERIC de Postgres (llegan como string).
function rowToData(row) {
  return {
    city: row.city,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    temperature: Number(row.temperature),
    humidity: row.humidity == null ? null : Number(row.humidity),
    condition_text: row.condition_text,
  };
}

/**
 * Persiste datos de clima en L2 (PostgreSQL) y también en L1 (memoria).
 * Usa cityKeyOf(city) para normalizar la clave, de modo que las variantes
 * con y sin tilde del mismo nombre actualicen la misma entrada de caché.
 *
 * @param {string} city  Nombre de ciudad tal como lo escribió el usuario
 * @param {object} data  Datos del clima a persistir
 * @returns {Promise<void>}
 */
// Persiste en L2 (Postgres) y refresca L1. Usa la clave normalizada de la
// ciudad consultada para que la caché acierte sin importar acentos.
async function persist(city, data) {
  const key = cityKeyOf(city);
  await WeatherCache.upsertWeather(
    key, data.city, data.latitude, data.longitude, data.temperature,
    data.condition_text, data.humidity
  );
  l1Set(key, data);
}

const WeatherService = {
  /**
   * Devuelve el clima de una ciudad aplicando la estrategia de caching multinivel.
   *
   * Decisión de qué fuente usar:
   *   1. L1 (memoria) si el dato es fresco: respuesta instantánea.
   *   2. L2 (PostgreSQL) si está fresco (< 15 min): pobla L1 y responde.
   *   3. L2 stale (15 min a 24 h): responde inmediatamente y revalida en segundo plano.
   *   4. Expirado o sin caché: llama a la API; guarda en L2 y L1.
   *   5. API caída pero hay dato stale: lo sirve como stale_fallback.
   *   6. API caída y sin caché: lanza 503.
   *
   * @param {string} city          Nombre de la ciudad
   * @param {string} correlationId Para trazabilidad en los logs
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
      const data = rowToData(cached);

      // Filas guardadas antes de existir la columna humedad: se refrescan desde
      // la API en vez de mostrarse incompletas (cae al bloque "EXPIRADO" de abajo).
      const hasHumidity = cached.humidity != null;

      // FRESH: servir directo y poblar L1.
      if (hasHumidity && ageMs <= FRESH_MS) {
        l1Set(key, data);
        return { source: 'cache', data };
      }

      // STALE: servir YA y revalidar en segundo plano (no bloquea la respuesta).
      if (hasHumidity && ageMs <= STALE_MS) {
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
        return { source: 'stale_fallback', data: rowToData(cached) };
      }
      // Si es un error de negocio (404 ciudad no encontrada), se propaga tal cual.
      if (err instanceof AppError) throw err;
      // Sin dato previo y API caída => 503.
      throw new AppError(503, 'Servicio meteorológico no disponible', 'WEATHER_UNAVAILABLE');
    }
  },

  /**
   * Encola la revalidación del clima de una ciudad en segundo plano.
   * El patrón Stale-While-Revalidate permite responder inmediatamente
   * con el dato viejo y actualizar la caché de forma asíncrona.
   * La cola de-duplica: si ya hay una revalidación en curso para "bogota",
   * no lanzamos otra y evitamos llamadas redundantes a Open-Meteo.
   *
   * @param {string} city
   * @param {string} correlationId
   */
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

  /**
   * Devuelve el estado actual de la cola de revalidación.
   * Expuesto para el endpoint /health y los tests de concurrencia.
   *
   * @returns {{ pending: number, active: number, tracked: number }}
   */
  // Expuesto para health checks / pruebas: estado de la cola de revalidación.
  getRevalidationQueueStats() {
    return revalidationQueue.stats();
  },

  /**
   * Devuelve sugerencias de ciudades para el autocompletado.
   * Pide 20 resultados al geocoding para tener de dónde priorizar Colombia,
   * y recorta a 8 para el desplegable. Ante cualquier error devuelve lista vacía
   * (el autocompletado nunca debe romper la UI).
   *
   * @param {string} q             Texto parcial del usuario (ej. "ca")
   * @param {string} correlationId
   * @returns {Promise<Array<{name,country,admin1,latitude,longitude,label}>>}
   */
  async suggestCities(q, correlationId) {
    // Pedimos más resultados (20) para tener de dónde priorizar Colombia,
    // y luego recortamos a los 6 más relevantes para el desplegable.
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=20&language=es&format=json`;
    try {
      const { data } = await axios.get(url, { timeout: 5000 });
      const results = data.results || [];

      const top = orderSuggestions(results).slice(0, 8);
      logger.info('weather.suggest', { correlationId, q, count: top.length });

      return top.map((r) => ({
        name: r.name,
        country: r.country || '',
        admin1: r.admin1 || '',          // región/departamento
        latitude: r.latitude,
        longitude: r.longitude,
        // Etiqueta legible para mostrar en el desplegable.
        label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
      }));
    } catch (err) {
      // El autocompletado nunca debe romper la UI: ante fallo, lista vacía.
      logger.warn('weather.suggest_failed', { correlationId, q, reason: err.message });
      return [];
    }
  },
};

module.exports = WeatherService;
// Funciones puras expuestas para pruebas unitarias.
module.exports.cityKeyOf = cityKeyOf;
module.exports.orderSuggestions = orderSuggestions;
