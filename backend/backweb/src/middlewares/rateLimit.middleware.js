// backend/backweb/src/middlewares/rateLimit.middleware.js
// ─────────────────────────────────────────────────────────
// Qué hace: Define dos limitadores con express-rate-limit. apiLimiter: 100 req/15 min en /api.
//           authLimiter: 10 req/15 min en login y registro para frenar fuerza bruta.
//           Los límites son configurables por variables de entorno en .env.
// Conectado con: auth.routes.js (authLimiter en login/registro), index.js (apiLimiter en /api).
// Rol: Protección contra abuso. Limita intentos de fuerza bruta en los endpoints sensibles.
const rateLimit = require('express-rate-limit');

// Ventana de tiempo compartida entre ambos limitadores. 15 min es el estándar OWASP.
const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min

// Máximo de peticiones por ventana para rutas generales y para auth respectivamente.
const generalMax = Number(process.env.RATE_LIMIT_MAX) || 100;
const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10;

/**
 * Respuesta de error al exceder el límite. Usa el mismo formato que errorHandler
 * para que el frontend no necesite manejar un caso especial para los 429.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
// Mensaje de error coherente con nuestro formato global
function limitMessage(req, res) {
  res.status(429).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Intenta más tarde.' },
    correlationId: req.correlationId,
  });
}

// Limitador general para toda la API
const apiLimiter = rateLimit({
  windowMs,
  max: generalMax,
  standardHeaders: true,  // devuelve RateLimit-* en la respuesta
  legacyHeaders: false,   // desactiva los X-RateLimit-* deprecados
  handler: limitMessage,
});

// Limitador estricto para endpoints sensibles (login/registro)
const authLimiter = rateLimit({
  windowMs,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitMessage,
});

module.exports = { apiLimiter, authLimiter };
