// backend/backweb/src/middlewares/validate.middleware.js
// Middleware genérico de validación con Zod.
// Valida una parte del request ('body' | 'query' | 'params') contra un schema
// y reemplaza el valor por el dato ya saneado/transformado por Zod.
const AppError = require('../utils/AppError');

/**
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source
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
