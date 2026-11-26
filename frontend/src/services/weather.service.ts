// frontend/src/services/weather.service.ts
// ─────────────────────────────────────────────────────────
// Qué hace: Servicio de clima tipado. Consulta el clima y el autocompletado usando http
//           (que envía el token y tiene reintentos). Define los tipos WeatherData,
//           WeatherSource y CitySuggestion que toda la aplicación usa.
// Conectado con: http.ts, CajaBusqueda.vue (suggestCities), InsigniaOrigen.vue (WeatherSource),
//               weather.store.ts (fetchWeather).
// Rol: Comunicación con la API del clima y fuente de tipos del dominio meteorológico.
import { http } from './http';

/**
 * Datos del clima tal como los devuelve el backend.
 * Se define aquí y se usa en toda la app para garantizar consistencia de tipos
 * entre el store, los servicios y los componentes.
 */
// Definimos la estructura estricta de los datos del clima según la rúbrica (Cero 'any')
export interface WeatherData {
  city: string;
  latitude: number;
  longitude: number;
  temperature: number;
  /** Humedad relativa en % (puede faltar en datos antiguos de la BD). */
  humidity: number | null;
  condition_text: string;
}

/**
 * Origen del dato según la estrategia de caching multinivel del backend.
 * Se muestra en la InsigniaOrigen para demostrar en tiempo real qué caché se usó.
 *
 * memory         -> L1 (mapa en memoria del proceso Node, latencia cero)
 * cache          -> L2 (PostgreSQL) fresco (< 15 min)
 * stale          -> L2 servido al instante y revalidado en segundo plano (SWR)
 * api_fresh      -> consultado directamente a Open-Meteo y guardado en BD
 * stale_fallback -> la API falló y se devolvió el último dato conocido
 */
// Origen del dato segun la estrategia de caching multinivel del backend.
// Debe coincidir con los valores que emite weather.service.js:
//   memory         -> L1 (cache en memoria del proceso)
//   cache          -> L2 (PostgreSQL) fresco
//   stale          -> L2 servido al instante y revalidado en 2o plano (SWR)
//   api_fresh      -> consultado directo a Open-Meteo
//   stale_fallback -> la API fallo y se devolvio el ultimo dato conocido
export type WeatherSource =
  | 'memory'
  | 'cache'
  | 'stale'
  | 'api_fresh'
  | 'stale_fallback';

/**
 * Envoltorio de la respuesta de la API de clima.
 * El campo `source` permite a la UI mostrar el origen del dato (InsigniaOrigen).
 */
// Definimos el contrato de la respuesta que nos manda el backend
export interface WeatherApiResponse {
  source: WeatherSource;
  data: WeatherData;
}

/**
 * Una sugerencia de ciudad del autocompletado.
 * label es el string ya formateado "Nombre, Región, País" para mostrar en el desplegable.
 */
// Sugerencia de ciudad para el autocompletado.
export interface CitySuggestion {
  name: string;
  country: string;
  admin1: string;    // región / departamento
  latitude: number;
  longitude: number;
  label: string;     // string formateado para mostrar en el desplegable
}

/** Respuesta del endpoint de sugerencias. */
interface SuggestResponse {
  success: boolean;
  data: CitySuggestion[];
}

// La URL base del backend
const API_BASE = '/api/weather';

export const WeatherService = {
  /**
   * Consulta el clima de una ciudad. La instancia `http` adjunta el Bearer token
   * automáticamente y reintenta ante 5xx o fallos de red.
   * El campo `source` de la respuesta indica qué nivel de caché sirvió el dato.
   *
   * @param city  Nombre de la ciudad a consultar
   */
  async fetchWeather(city: string): Promise<WeatherApiResponse> {
    const response = await http.get<WeatherApiResponse>(API_BASE, {
      params: { city }
    });
    return response.data;
  },

  /**
   * Obtiene sugerencias de ciudades para el autocompletado.
   * Se llama desde CajaBusqueda con debounce de 300 ms.
   * Las sugerencias ya vienen priorizadas (Colombia primero) por el backend.
   *
   * @param q  Texto parcial escrito por el usuario
   */
  async suggestCities(q: string): Promise<CitySuggestion[]> {
    const response = await http.get<SuggestResponse>(`${API_BASE}/suggest`, {
      params: { q },
    });
    return response.data.data;
  },
};
