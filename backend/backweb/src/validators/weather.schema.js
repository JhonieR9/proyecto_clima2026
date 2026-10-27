// backend/backweb/src/validators/weather.schema.js
// Validación del query de consulta de clima. CORE: validación con schemas + anti-inyección.
const { z } = require('zod');

const weatherQuerySchema = z.object({
  city: z
    .string({ required_error: 'El parámetro "city" es obligatorio.' })
    .trim()
    .min(2, 'La ciudad debe tener al menos 2 caracteres')
    .max(100, 'La ciudad es demasiado larga')
    // Solo letras (incluye acentos/ñ), espacios, guiones, puntos y comas.
    // Previene cargas útiles de XSS/SQLi en el nombre de ciudad.
    .regex(/^[\p{L}\s.,'-]+$/u, 'La ciudad contiene caracteres no válidos'),
});

// Validación del query del autocompletado. Permite texto parcial (desde 1 char).
const suggestQuerySchema = z.object({
  q: z
    .string({ required_error: 'El parámetro "q" es obligatorio.' })
    .trim()
    .min(1, 'Escribe al menos 1 caracter')
    .max(100, 'La búsqueda es demasiado larga')
    .regex(/^[\p{L}\s.,'-]+$/u, 'La búsqueda contiene caracteres no válidos'),
});

module.exports = { weatherQuerySchema, suggestQuerySchema };
