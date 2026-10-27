// backend/backweb/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const runMigrations = require('./config/migrate');
const logger = require('./utils/logger');

const correlationId = require('./middlewares/correlationId.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const weatherRoutes = require('./routes/weather.routes');
const favoriteRoutes = require('./routes/favorite.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Seguridad base ---
app.use(helmet()); // cabeceras seguras (XSS, clickjacking, etc.)
app.use(
  cors({
    // Permite enviar/recibir la cookie HttpOnly del refresh token.
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// --- Observabilidad: correlation-id + log de acceso ---
app.use(correlationId);

// --- Rate limiting general ---
app.use('/api', apiLimiter);

// --- Documentación ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Rutas ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/favorites', favoriteRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API corriendo', docs: '/api-docs' });
});

// --- Manejo de errores (siempre al final) ---
app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      logger.info('server.started', { port: PORT, docs: `/api-docs` });
      console.log(`Servidor en http://localhost:${PORT}`);
      console.log(`Swagger en  http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    logger.error('server.start_failed', { reason: err.message });
    process.exit(1);
  }
}

start();
