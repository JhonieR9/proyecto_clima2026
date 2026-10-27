// frontend/src/services/favorite.service.ts
// Servicio de ciudades favoritas (requiere sesión; usa la instancia http con
// el Bearer token y el manejo de 401/refresh ya integrado).
import { http } from './http';

export interface Favorite {
  id: number;
  city: string;
  city_key: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface ListResponse {
  success: boolean;
  data: Favorite[];
}
interface AddResponse {
  success: boolean;
  data: Favorite;
}

export const FavoriteService = {
  async list(): Promise<Favorite[]> {
    const { data } = await http.get<ListResponse>('/api/favorites');
    return data.data;
  },

  async add(payload: { city: string; latitude?: number; longitude?: number }): Promise<Favorite> {
    const { data } = await http.post<AddResponse>('/api/favorites', payload);
    return data.data;
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/api/favorites/${id}`);
  },
};
