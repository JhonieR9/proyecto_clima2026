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

// Definimos el contrato de la respuesta que nos manda el backend
export interface WeatherApiResponse {
  source: 'cache' | 'api_fresh';
  data: WeatherData;
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
  }
};
