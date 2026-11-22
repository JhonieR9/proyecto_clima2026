// backend/backweb/src/middlewares/correlationId.middleware.js
// Asigna un ID único a cada petición para rastrear su flujo en los logs.
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

function correlationId(req, res, next) {
  // Respeta el id entrante si el cliente ya lo envió; si no, genera uno.
  const id = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = id;
  res.setHeader('x-correlation-id', id);

  const startedAt = Date.now();

  // Log de acceso al terminar la respuesta
  res.on('finish', () => {
    logger.info('request', {
      correlationId: id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
}

module.exports = correlationId;
