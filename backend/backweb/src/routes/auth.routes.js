// backend/backweb/src/routes/auth.routes.js
const { Router } = require('express');
const AuthController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimit.middleware');
const { registerSchema, loginSchema } = require('../validators/auth.schema');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticación con doble token (access + refresh rotativo)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Juan Pérez }
 *               email: { type: string, example: juan@example.com }
 *               password: { type: string, example: secreto123 }
 *     responses:
 *       201: { description: Usuario creado }
 *       400: { description: Datos inválidos }
 *       409: { description: Email ya registrado }
 */
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión. Devuelve accessToken y setea cookie HttpOnly con el refresh.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: juan@example.com }
 *               password: { type: string, example: secreto123 }
 *     responses:
 *       200: { description: Login correcto }
 *       401: { description: Credenciales inválidas }
 */
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Rota el refresh token (cookie) y entrega un nuevo access token.
 *     tags: [Auth]
 *     responses:
 *       200: { description: Nuevo par de tokens }
 *       401: { description: Refresh inválido o revocado }
 */
router.post('/refresh', AuthController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cierra la sesión y revoca el refresh token actual.
 *     tags: [Auth]
 *     responses:
 *       200: { description: Sesión cerrada }
 */
router.post('/logout', AuthController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Devuelve los datos del usuario autenticado.
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos del usuario }
 *       401: { description: No autenticado }
 */
router.get('/me', authenticate, AuthController.me);

module.exports = router;
