// backend/backweb/src/validators/favorite.schema.js
// ─────────────────────────────────────────────────────────
// Qué hace: Define el schema Zod para agregar una favorita. Ciudad: 2-100 caracteres,
//           solo letras y signos seguros (anti-inyección). Latitud y longitud opcionales
//           con rangos -90/90 y -180/180.
// Conectado con: favorite.routes.js (lo usa en validate), favorite.schema.test.js.
// Rol: Contrato de entrada para favoritas. Protege el endpoint contra datos inválidos.
const { z } = require('zod');

const addFavoriteSchema = z.object({
  city: z
    .string({ required_error: 'La ciudad es obligatoria' })
    .trim()
    .min(2, 'La ciudad debe tener al menos 2 caracteres')
    .max(100, 'La ciudad es demasiado larga')
    .regex(/^[\p{L}\s.,'-]+$/u, 'La ciudad contiene caracteres no válidos'),
  // Coordenadas opcionales (si vienen del autocompletado o del resultado).
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

module.exports = { addFavoriteSchema };
