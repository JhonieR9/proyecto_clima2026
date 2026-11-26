// backend/backweb/src/utils/AppError.js
// ─────────────────────────────────────────────────────────
// Qué hace: Define la clase AppError con statusCode HTTP y code semántico.
//           Atajos estáticos: badRequest(400), unauthorized(401), forbidden(403),
//           notFound(404) y conflict(409). isOperational:true distingue errores de bugs.
// Conectado con: auth.middleware.js, error.middleware.js, validate.middleware.js,
//               auth.service.js, weather.service.js, user.controller.js, favorite.controller.js.
// Rol: Sistema de errores tipados. Permite lanzar un error con código HTTP desde cualquier capa.

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
    // isOperational distingue errores de negocio (esperados, se muestran al cliente)
    // de bugs de programación (inesperados, solo se loguean en el servidor).
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Error 400: datos de entrada inválidos o incompletos.
   * Se usa cuando la validación de Zod falla o faltan campos obligatorios.
   *
   * @param {string} [message]
   * @param {object} [details]  Array de { field, message } de Zod
   */
  static badRequest(message, details) {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }

  /**
   * Error 401: el usuario no está autenticado o su token es inválido.
   * Se usa cuando no hay token, está expirado o las credenciales son incorrectas.
   *
   * @param {string} [message]
   */
  static unauthorized(message = 'No autenticado') {
    return new AppError(401, message, 'UNAUTHORIZED');
  }

  /**
   * Error 403: el usuario está autenticado pero no tiene permisos.
   * Se usa cuando el rol no es suficiente o el recurso no le pertenece.
   *
   * @param {string} [message]
   */
  static forbidden(message = 'No autorizado') {
    return new AppError(403, message, 'FORBIDDEN');
  }

  /**
   * Error 404: el recurso solicitado no existe en la base de datos.
   *
   * @param {string} [message]
   */
  static notFound(message = 'Recurso no encontrado') {
    return new AppError(404, message, 'NOT_FOUND');
  }

  /**
   * Error 409: conflicto con el estado actual (ej: correo ya registrado).
   *
   * @param {string} message
   */
  static conflict(message) {
    return new AppError(409, message, 'CONFLICT');
  }
}

module.exports = AppError;
