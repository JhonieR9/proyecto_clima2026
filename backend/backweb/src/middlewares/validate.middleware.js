// backend/backweb/src/middlewares/validate.middleware.js
// ─────────────────────────────────────────────────────────
// Qué hace: Fábrica validate(schema, source) que valida body/query/params con Zod.
//           Si falla responde 400 con detalle por campo. Si pasa, reemplaza el dato
//           original por la versión saneada (correo en minúsculas, texto recortado, etc.).
// Conectado con: AppError.js (lanza badRequest), auth.routes.js, weather.routes.js, favorite.routes.js.
// Rol: Puerta de entrada de datos. Garantiza que ningún controlador reciba datos sucios.
const AppError = require('../utils/AppError');

/**
 * Genera un middleware de validación con Zod para body, query o params.
 * Si la validación falla, lanza AppError 400 con detalles por campo para que
 * el cliente (o el test) sepa exactamente qué campo es incorrecto.
 * Si pasa, sustituye req[source] por result.data, que ya viene transformado
 * (p. ej. el email en minúsculas, el texto recortado).
 *
 * @param {import('zod').ZodSchema} schema  Schema Zod a aplicar
 * @param {'body'|'query'|'params'} [source='body']  Parte de la request a validar
 * @returns {import('express').RequestHandler}
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // Formateamos los errores de Zod a algo legible
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(AppError.badRequest('Datos de entrada inválidos', details));
    }

    // Guardamos el dato validado y transformado (trim, lowercase, etc.)
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
