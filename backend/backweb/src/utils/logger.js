// backend/backweb/src/utils/logger.js
// Logger estructurado (JSON) con soporte para x-correlation-id.
// Cumple el requisito del CORE: "logs estructurados con x-correlation-id".

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
