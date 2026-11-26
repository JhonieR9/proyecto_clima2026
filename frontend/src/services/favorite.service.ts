// frontend/src/services/favorite.service.ts
// ─────────────────────────────────────────────────────────
// Qué hace: Servicio de favoritas tipado. Llama a GET, POST y DELETE de /api/favorites
//           usando la instancia http. El token Bearer se añade automáticamente
//           por el interceptor de http.ts.
// Conectado con: http.ts (instancia Axios con interceptores y token), favorite.store.ts.
// Rol: Comunicación con la API de favoritas. Se beneficia de reintentos y renovado de token.
import { http } from './http';

/**
 * Favorita tal como la devuelve el backend.
 * city_key es la versión normalizada del nombre, útil para de-duplicación en el store.
 * latitude y longitude son opcionales: si el usuario añade la ciudad sin seleccionarla
 * del autocompletado, pueden no estar disponibles.
 */
export interface Favorite {
  id: number;
  city: string;
  city_key: string;        // versión normalizada del nombre (sin tildes, en minúsculas)
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

/** Envoltorio de la respuesta de listado de favoritas. */
interface ListResponse {
  success: boolean;
  data: Favorite[];
}

/** Envoltorio de la respuesta al agregar una favorita. */
interface AddResponse {
  success: boolean;
  data: Favorite;
}

export const FavoriteService = {
  /**
   * Obtiene todas las favoritas del usuario autenticado (el token lo adjunta el interceptor).
   * El backend devuelve solo las del usuario actual (aislamiento por user_id en SQL).
   */
  async list(): Promise<Favorite[]> {
    const { data } = await http.get<ListResponse>('/api/favorites');
    return data.data;
  },

  /**
   * Agrega una ciudad a favoritas del usuario autenticado.
   * El endpoint es idempotente (ON CONFLICT en BD): si la ciudad ya es favorita,
   * devuelve la fila existente sin duplicar.
   *
   * @param payload.city       Nombre de la ciudad
   * @param payload.latitude   Latitud (opcional, viene del autocompletado)
   * @param payload.longitude  Longitud (opcional, viene del autocompletado)
   */
  async add(payload: { city: string; latitude?: number; longitude?: number }): Promise<Favorite> {
    const { data } = await http.post<AddResponse>('/api/favorites', payload);
    return data.data;
  },

  /**
   * Elimina una favorita por su ID.
   * El backend verifica que la favorita pertenezca al usuario autenticado
   * (WHERE id = $1 AND user_id = $2), así que un usuario no puede borrar las ajenas.
   *
   * @param id  ID de la favorita a eliminar
   */
  async remove(id: number): Promise<void> {
    await http.delete(`/api/favorites/${id}`);
  },
};
