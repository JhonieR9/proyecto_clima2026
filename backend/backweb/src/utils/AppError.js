// backend/backweb/src/utils/AppError.js
// Error de aplicación tipado. Permite lanzar errores con un statusCode HTTP
// y un código semántico, para que el manejador global de excepciones
// responda de forma consistente (CORE: "manejo global de excepciones").

class AppError extends Error {
  /**
   * @param {number} statusCode  Código HTTP (400, 401, 403, 404, 409, 429, 500...)
   * @param {string} message     Mensaje legible para el cliente
   * @param {string} [code]      Código semántico interno (ej: 'INVALID_CREDENTIALS')
   * @param {object} [details]   Detalles adicionales (ej: errores de validación Zod)
   */
  constructor(statusCode, message, code = 'APP_ERROR', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Error esperado, no un bug inesperado
    Error.captureStackTrace(this, this.constructor);
  }

  // Atajos de uso común
  static badRequest(message, details) {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'No autenticado') {
    return new AppError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'No autorizado') {
    return new AppError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Recurso no encontrado') {
    return new AppError(404, message, 'NOT_FOUND');
  }
  static conflict(message) {
    return new AppError(409, message, 'CONFLICT');
  }
}

module.exports = AppError;
