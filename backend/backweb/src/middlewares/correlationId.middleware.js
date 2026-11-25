// backend/backweb/src/middlewares/correlationId.middleware.js
// ─────────────────────────────────────────────────────────
// Qué hace: Asigna un UUID a cada petición entrante (lo genera o lo lee de x-correlation-id).
//           Lo pone en req.correlationId y en el header de respuesta.
//           Al terminar la respuesta escribe un log con método, ruta, status y duración.
// Conectado con: logger.js (escribe los logs de acceso), index.js (middleware global).
// Rol: Observabilidad. Permite rastrear cualquier petición de principio a fin en los logs.
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
