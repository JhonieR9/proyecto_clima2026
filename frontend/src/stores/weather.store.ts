// frontend/src/stores/weather.store.ts
import { defineStore } from 'pinia';
import { AxiosError } from 'axios';
import {
  WeatherService,
  type WeatherData,
  type WeatherSource,
} from '../services/weather.service';

// 1. Definimos la estructura estricta del estado de nuestra tienda
interface WeatherState {
  currentWeather: WeatherData | null;
  loading: boolean;
  error: string | null;
  sourceInfo: WeatherSource | null;
}

// Forma del cuerpo de error que devuelve el backend.
interface ApiErrorBody {
  error?: { code?: string; message?: string } | string;
  message?: string;
}

export const useWeatherStore = defineStore('weather', {
  // 2. Estado centralizado de la aplicación
  state: (): WeatherState => ({
    currentWeather: null,
    loading: false,
    error: null,
    sourceInfo: null
  }),

  // 3. Acciones asíncronas para mutar el estado y comunicarse con el servicio
  actions: {
    async searchCityWeather(city: string) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await WeatherService.fetchWeather(city);
        this.sourceInfo = response.source;
        this.currentWeather = response.data ?? null;

        if (!this.currentWeather) {
          this.error = `No se encontraron datos disponibles para: ${city}`;
        }
      } catch (err: unknown) {
        this.currentWeather = null;
        this.sourceInfo = null;
        this.error = this.extractError(err, 'No se pudo conectar con el servidor meteorológico.');
      } finally {
        this.loading = false;
      }
    },

    // Acción rápida por si deseas limpiar los paneles de la pantalla
    clearState() {
      this.currentWeather = null;
      this.error = null;
      this.sourceInfo = null;
    },

    // Normaliza el error del backend ({ error: { message } } o { error: string })
    // a un mensaje legible, sin recurrir al tipo 'any'.
    extractError(err: unknown, fallback: string): string {
      if (err instanceof AxiosError) {
        const body = err.response?.data as ApiErrorBody | undefined;
        if (body) {
          if (typeof body.error === 'string') return body.error;
          if (body.error?.message) return body.error.message;
          if (body.message) return body.message;
        }
      }
      return fallback;
    }
  }
});
