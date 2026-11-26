// frontend/src/stores/weather.store.ts
// ─────────────────────────────────────────────────────────
// Qué hace: Store del clima (Pinia). Guarda el último clima consultado, el estado de carga,
//           el error y el sourceInfo (de dónde vino el dato). extractError convierte
//           el error del backend en texto sin usar any.
// Conectado con: weather.service.ts, BuscadorView.vue, ResultadoClimaView.vue, router/index.ts.
// Rol: Puente entre la búsqueda del usuario y la tarjeta de resultado.
import { defineStore } from 'pinia';
import { AxiosError } from 'axios';
import {
  WeatherService,
  type WeatherData,
  type WeatherSource,
} from '../services/weather.service';

/**
 * Estado del store de clima.
 * currentWeather es lo que el guard beforeEnter de /result verifica para decidir
 * si el usuario puede entrar a esa ruta.
 */
// 1. Definimos la estructura estricta del estado de nuestra tienda
interface WeatherState {
  currentWeather: WeatherData | null;
  loading: boolean;
  error: string | null;
  sourceInfo: WeatherSource | null; // origen del dato (para InsigniaOrigen)
}

/** Forma del cuerpo de error que devuelve el backend. */
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
    /**
     * Busca el clima de una ciudad.
     * Si tiene éxito, guarda el resultado y el origen del dato (source).
     * Si falla, limpia el resultado y guarda el mensaje de error.
     * El router navega a /result solo si currentWeather no es null tras esta acción.
     *
     * @param city  Nombre de la ciudad a consultar
     */
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

    /**
     * Limpia el estado de clima.
     * Se llama al volver al buscador para que la pantalla quede en blanco.
     */
    // Acción rápida por si deseas limpiar los paneles de la pantalla
    clearState() {
      this.currentWeather = null;
      this.error = null;
      this.sourceInfo = null;
    },

    /**
     * Extrae el mensaje de error del cuerpo de respuesta del backend.
     * El backend responde { error: { code, message } } o { error: string }.
     * Esta función normaliza ambos formatos a un string sin usar 'any'.
     *
     * @param err      Error capturado en el bloque catch
     * @param fallback Mensaje por defecto si no se puede extraer uno del error
     */
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
