// backend/backweb/src/routes/favorite.routes.js
// ─────────────────────────────────────────────────────────
// Qué hace: Define las tres rutas de favoritas: listar, agregar y eliminar.
//           Aplica authenticate a todo el router con router.use, así todas exigen sesión.
//           La ruta de agregar además valida el cuerpo con addFavoriteSchema.
// Conectado con: favorite.controller.js, validate.middleware.js, auth.middleware.js,
//               favorite.schema.js, index.js.
// Rol: Enrutador de favoritas. Ninguna operación sobre favoritas puede hacerse sin sesión.
const { Router } = require('express');
const FavoriteController = require('../controllers/favorite.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { addFavoriteSchema } = require('../validators/favorite.schema');

const router = Router();

// Todas las rutas de favoritos requieren estar autenticado.
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Favorites
 *   description: Ciudades favoritas del usuario autenticado
 */

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Lista las ciudades favoritas del usuario
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de favoritas }
 *   post:
 *     summary: Agrega una ciudad a favoritas
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [city]
 *             properties:
 *               city: { type: string, example: Cali }
 *               latitude: { type: number, example: 3.43722 }
 *               longitude: { type: number, example: -76.5225 }
 *     responses:
 *       201: { description: Favorita agregada }
 */
router.get('/', FavoriteController.list);
router.post('/', validate(addFavoriteSchema), FavoriteController.add);

/**
 * @swagger
 * /api/favorites/{id}:
 *   delete:
 *     summary: Elimina una ciudad favorita
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Favorita eliminada }
 *       404: { description: Favorita no encontrada }
 */
router.delete('/:id', FavoriteController.remove);

module.exports = router;
