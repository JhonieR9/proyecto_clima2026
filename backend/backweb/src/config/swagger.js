// backend/backweb/src/config/swagger.js
// ─────────────────────────────────────────────────────────
// Qué hace: Configura Swagger (OpenAPI 3.0) leyendo los comentarios @swagger
//           de los archivos de rutas. Define título, versión, URL y esquema Bearer.
//           Exporta swaggerSpec que se monta en /api-docs.
// Conectado con: index.js (monta la UI de Swagger), routes/*.js (los @swagger se leen aquí).
// Rol: Genera la documentación interactiva de la API automáticamente desde el código.
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BackWeb API',
      version: '1.0.0',
      description: 'API REST con Express y PostgreSQL',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Servidor local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
