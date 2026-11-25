// frontend/src/services/weather.service.ts
// Consulta el clima y las sugerencias de ciudades al backend usando la instancia http.
// Conectado con: http.ts, CajaBusqueda.vue, InsigniaOrigen.vue, weather.store.ts
import { http } from './http';

// Definimos la estructura estricta de los datos del clima según la rúbrica (Cero 'any')
export interface WeatherData {
  city: string;
  latitude: number;
  longitude: number;
  temperature: number;
  /** Humedad relativa en % (puede faltar en datos antiguos). */
  humidity: number | null;
  condition_text: string;
}

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

// Definimos el contrato de la respuesta que nos manda el backend
export interface WeatherApiResponse {
  source: WeatherSource;
  data: WeatherData;
}

// Sugerencia de ciudad para el autocompletado.
export interface CitySuggestion {
  name: string;
  country: string;
  admin1: string;
  latitude: number;
  longitude: number;
  label: string;
}

interface SuggestResponse {
  success: boolean;
  data: CitySuggestion[];
}

// La URL base del backend
const API_BASE = '/api/weather';

export const WeatherService = {
  async fetchWeather(city: string): Promise<WeatherApiResponse> {
    const response = await http.get<WeatherApiResponse>(API_BASE, {
      params: { city }
    });
    return response.data;
  },

  async suggestCities(q: string): Promise<CitySuggestion[]> {
    const response = await http.get<SuggestResponse>(`${API_BASE}/suggest`, {
      params: { q },
    });
    return response.data.data;
  },
};
