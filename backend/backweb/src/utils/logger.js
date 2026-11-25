// backend/backweb/src/utils/logger.js
// ─────────────────────────────────────────────────────────
// Qué hace: Logger estructurado que escribe en formato JSON a stdout/stderr.
//           Tres niveles: info, warn y error. Cada entrada incluye timestamp, level,
//           message y metadatos adicionales (correlationId, ruta, duración, etc.).
// Conectado con: correlationId.middleware.js, error.middleware.js, weather.service.js,
//               taskQueue.js, index.js.
// Rol: Observabilidad centralizada. Todos los eventos del servidor pasan por aquí.

/**
 * Emite una línea de log en formato JSON hacia stdout/stderr.
 * El formato estructurado facilita el parseo por herramientas externas
 * (ELK, CloudWatch, etc.) y mantiene la trazabilidad por request.
 *
 * @param {'info'|'warn'|'error'} level  Nivel del log
 * @param {string} message               Mensaje legible
 * @param {object} [meta]                 Metadatos extra (correlationId, path, etc.)
 */
function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

const logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};

module.exports = logger;
