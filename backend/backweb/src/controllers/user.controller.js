const UserModel = require('../models/user.model');
const AppError = require('../utils/AppError');

const UserController = {
  async getAll(req, res, next) {
    try {
      const users = await UserModel.findAll();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const user = await UserModel.findById(req.params.id);
      if (!user) throw AppError.notFound('Usuario no encontrado');
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

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
