// backend/backweb/src/controllers/user.controller.js
// ─────────────────────────────────────────────────────────
// Qué hace: Gestiona las operaciones CRUD sobre usuarios.
//           Listar, crear y eliminar requieren rol admin.
//           Actualizar solo permite cambiar nombre y correo, no el rol ni la contraseña.
// Conectado con: user.model.js (consultas SQL directas), AppError.js, user.routes.js.
// Rol: Controlador de usuarios. Sin servicio intermedio porque son operaciones simples de CRUD.
const UserModel = require('../models/user.model');
const AppError = require('../utils/AppError');

const UserController = {
  /**
   * Devuelve todos los usuarios del sistema (sin contraseñas).
   * Solo accesible por administradores (guard en la ruta).
   *
   * @param {import('express').Request}  req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getAll(req, res, next) {
    try {
      const users = await UserModel.findAll();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Devuelve un usuario concreto por su ID.
   * El guard authorizeSelfOrAdmin asegura que solo el dueño del recurso o un admin pueda verlo.
   *
   * @param {import('express').Request}  req  - req.params.id: ID del usuario a consultar
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getById(req, res, next) {
    try {
      const user = await UserModel.findById(req.params.id);
      if (!user) throw AppError.notFound('Usuario no encontrado');
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Crea un nuevo usuario desde el panel de administración.
   * El registro público se hace a través de /api/auth/register (con rate limiting).
   * Verifica que el correo no esté ya registrado antes de insertar.
   *
   * @param {import('express').Request}  req  - req.body: { name, email, password }
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async create(req, res, next) {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        throw AppError.badRequest('name, email y password son requeridos');
      }

      const existing = await UserModel.findByEmail(email);
      if (existing) {
        throw AppError.conflict('El email ya está registrado');
      }

      const user = await UserModel.create({ name, email, password });
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Actualiza nombre y correo de un usuario.
   * No permite cambiar el rol ni la contraseña por esta vía para evitar
   * escaladas de privilegio accidentales desde la interfaz.
   *
   * @param {import('express').Request}  req  - req.params.id, req.body: { name, email }
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async update(req, res, next) {
    try {
      const { name, email } = req.body;
      if (!name || !email) {
        throw AppError.badRequest('name y email son requeridos');
      }

      const user = await UserModel.update(req.params.id, { name, email });
      if (!user) throw AppError.notFound('Usuario no encontrado');
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Elimina un usuario del sistema.
   * ON DELETE CASCADE en la BD elimina automáticamente sus refresh tokens y favoritas.
   * Solo accesible por administradores (guard en la ruta).
   *
   * @param {import('express').Request}  req  - req.params.id: ID del usuario a eliminar
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async remove(req, res, next) {
    try {
      const user = await UserModel.delete(req.params.id);
      if (!user) throw AppError.notFound('Usuario no encontrado');
      res.json({ success: true, message: 'Usuario eliminado correctamente' });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = UserController;
