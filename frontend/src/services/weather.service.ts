// frontend/src/services/weather.service.ts
import axios from 'axios';

// Definimos la estructura estricta de los datos del clima según la rúbrica (Cero 'any')
export interface WeatherData {
  city: string;
  latitude: number;
  longitude: number;
  temperature: number;
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

// La URL apunta al backend que corre en el puerto 3000
const API_URL = 'http://localhost:3000/api/weather';

export const WeatherService = {
  /**
   * Consulta el clima de una ciudad enviando la solicitud a nuestro Backend de Express
   * @param city Nombre de la ciudad a buscar (ej: "Bogota", "Cali")
   */
  async fetchWeather(city: string): Promise<WeatherApiResponse> {
    const response = await axios.get<WeatherApiResponse>(API_URL, {
      params: { city }
    });
    return response.data;
  },

  /**
   * Autocompletado: devuelve ciudades que coinciden con el texto parcial.
   * @param q Texto parcial (ej. "cal")
   */
  async suggestCities(q: string): Promise<CitySuggestion[]> {
    const response = await axios.get<SuggestResponse>(`${API_URL}/suggest`, {
      params: { q },
    });
    return response.data.data;
  },
};
