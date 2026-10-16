// backend/backweb/src/middlewares/error.middleware.js
// Manejo GLOBAL de excepciones. CORE: "Manejo global de excepciones".
// Es el último middleware; captura cualquier error lanzado en la cadena.
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// 404 para rutas no registradas
function notFoundHandler(req, _res, next) {
  next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// Manejador de errores (firma de 4 argumentos => Express lo trata como error handler)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const isApp = err instanceof AppError;
  const statusCode = isApp ? err.statusCode : 500;
  const code = isApp ? err.code : 'INTERNAL_ERROR';

  // Log estructurado con la traza y el correlation-id de la request
  logger.error(err.message, {
    correlationId: req.correlationId,
    code,
    statusCode,
    path: req.originalUrl,
    stack: statusCode >= 500 ? err.stack : undefined,
  });

  const body = {
    success: false,
    error: {
      code,
      // No filtramos detalles internos de errores 500 al cliente
      message: statusCode >= 500 ? 'Error interno del servidor' : err.message,
    },
    correlationId: req.correlationId,
  };

  if (isApp && err.details) {
    body.error.details = err.details;
  }

  res.status(statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
