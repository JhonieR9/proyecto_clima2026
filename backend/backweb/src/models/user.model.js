const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Factor de coste de bcrypt. 12 es el minimo recomendado hoy; configurable por env.
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

const UserModel = {
  async findAll() {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY id'
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  },

  // `executor` permite pasar un cliente de transaccion; por defecto usa el pool.
  async create({ name, email, password, role = 'user' }, executor = pool) {
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows } = await executor.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hashed, role]
    );
    return rows[0];
  },

  // Comparación de contraseña en texto plano contra el hash almacenado.
  async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  },

  async update(id, { name, email }) {
    const { rows } = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, created_at',
      [name, email, id]
    );
    return rows[0] || null;
  },

  async delete(id) {
    const { rows } = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    return rows[0] || null;
  },
};

module.exports = UserModel;
