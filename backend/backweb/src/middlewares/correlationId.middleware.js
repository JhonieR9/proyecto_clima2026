// backend/backweb/src/middlewares/correlationId.middleware.js
// ─────────────────────────────────────────────────────────
// Qué hace: Asigna un UUID a cada petición entrante (lo genera o lo lee de x-correlation-id).
//           Lo pone en req.correlationId y en el header de respuesta.
//           Al terminar la respuesta escribe un log con método, ruta, status y duración.
// Conectado con: logger.js (escribe los logs de acceso), index.js (middleware global).
// Rol: Observabilidad. Permite rastrear cualquier petición de principio a fin en los logs.
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

/**
 * Middleware de correlación de peticiones.
 * - Si el cliente envía x-correlation-id, lo reutiliza; si no, genera un UUID nuevo.
 *   Reutilizarlo permite que un API gateway o el frontend rastreen la misma operación
 *   end-to-end con un único identificador.
 * - Al terminar la respuesta (evento 'finish'), registra un log de acceso con duración.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
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
