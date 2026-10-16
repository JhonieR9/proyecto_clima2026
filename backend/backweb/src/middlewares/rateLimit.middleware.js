// backend/backweb/src/middlewares/rateLimit.middleware.js
// Rate limiting. CORE: "rate limiting". Protege contra abuso y fuerza bruta.
const rateLimit = require('express-rate-limit');

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min
const generalMax = Number(process.env.RATE_LIMIT_MAX) || 100;
const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX) || 10;

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
  standardHeaders: true,
  legacyHeaders: false,
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
