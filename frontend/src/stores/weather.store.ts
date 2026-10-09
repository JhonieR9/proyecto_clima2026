// frontend/src/stores/weather.store.ts
import { defineStore } from 'pinia';
import { WeatherService, type WeatherData } from '../services/weather.service.ts';




// 1. Definimos la estructura estricta del estado de nuestra tienda
interface WeatherState {
  currentWeather: WeatherData | null;
  loading: boolean;
  error: string | null;
  sourceInfo: 'cache' | 'api_fresh' | null;
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

        // Validamos si la respuesta vino dentro de un arreglo (común desde PostgreSQL) o directa
        if (Array.isArray(response.data)) {
          this.currentWeather = response.data[0] || null;
        } else {
          this.currentWeather = response.data;
        }
        
        if (!this.currentWeather) {
          this.error = `No se encontraron datos disponibles para: ${city}`;
        }
      } catch (err: any) {
        this.currentWeather = null;
        this.sourceInfo = null;
        // Captura mensajes detallados de error que vengan del servidor
        this.error = err.response?.data?.error || 'No se pudo conectar con el servidor meteorológico.';
      } finally {
        this.loading = false;
      }
    },

    // Acción rápida por si deseas limpiar los paneles de la pantalla
    clearState() {
      this.currentWeather = null;
      this.error = null;
      this.sourceInfo = null;
    }
  }
});
