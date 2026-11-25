// backend/backweb/src/validators/weather.schema.js
// ─────────────────────────────────────────────────────────
// Qué hace: Define dos schemas Zod. weatherQuerySchema valida city (mín 2, anti-inyección).
//           suggestQuerySchema es igual pero desde 1 carácter para el autocompletado.
//           Ambos rechazan caracteres que podrían usarse para inyección SQL o XSS.
// Conectado con: weather.routes.js (los usa en validate), validators.test.js.
// Rol: Primera línea de defensa contra datos maliciosos en los parámetros de búsqueda.
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
