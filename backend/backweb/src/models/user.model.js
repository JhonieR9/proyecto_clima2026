// backend/backweb/src/models/user.model.js
// ─────────────────────────────────────────────────────────
// Qué hace: Repositorio de usuarios. create hashea la contraseña con bcrypt (12 rondas).
//           findByEmail devuelve el hash para compararlo en login.
//           Los demás métodos nunca devuelven el campo password en sus resultados.
// Conectado con: db.js (pool de conexiones), auth.service.js (login/registro), user.controller.js.
// Rol: Única capa que toca la contraseña. Garantiza que nunca salga en texto plano.
const pool = require('../config/db');

// Factor de coste de bcrypt. 12 es el mínimo recomendado hoy; configurable por env.
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

const UserModel = {
  /**
   * Devuelve todos los usuarios del sistema sin el campo password.
   * Ordenados por id ascendente para que la lista sea determinista.
   *
   * @returns {Promise<Array<{id,name,email,role,created_at}>>}
   */
  async findAll() {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY id'
    );
    return rows;
  },

  /**
   * Busca un usuario por su ID, sin incluir el campo password.
   *
   * @param {number|string} id
   * @returns {Promise<{id,name,email,role,created_at}|null>}
   */
  async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Busca un usuario por correo electrónico e incluye el campo password.
   * Este es el único método que devuelve la contraseña hasheada, necesaria
   * para la comparación en el login. Los demás métodos la omiten.
   *
   * @param {string} email
   * @returns {Promise<{id,name,email,password,role,created_at}|null>}
   */
  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  },

  /**
   * Crea un nuevo usuario hasheando la contraseña antes de guardarla.
   * El parámetro `executor` permite usar un cliente de transacción para
   * operaciones atómicas (ej. registrar usuario y guardar token en un solo BEGIN/COMMIT).
   *
   * @param {{ name: string, email: string, password: string, role?: string }} param0
   * @param {import('pg').Pool|import('pg').PoolClient} [executor=pool]
   * @returns {Promise<{id,name,email,role,created_at}>}
   */
  // `executor` permite pasar un cliente de transaccion; por defecto usa el pool.
  async create({ name, email, password, role = 'user' }, executor = pool) {
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows } = await executor.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hashed, role]
    );
    return rows[0];
  },

  /**
   * Compara una contraseña en texto plano con el hash almacenado.
   * bcrypt.compare es resistente a timing attacks gracias a la comparación constante.
   *
   * @param {string} plain  Contraseña en texto plano enviada por el usuario
   * @param {string} hash   Hash almacenado en la base de datos
   * @returns {Promise<boolean>}
   */
  // Comparación de contraseña en texto plano contra el hash almacenado.
  async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  },

  /**
   * Actualiza nombre y correo de un usuario. No permite cambiar el rol ni la
   * contraseña por diseño; hacerlo desde esta ruta abriría vectores de escalada.
   *
   * @param {number|string} id
   * @param {{ name: string, email: string }} param1
   * @returns {Promise<{id,name,email,created_at}|null>}
   */
  async update(id, { name, email }) {
    const { rows } = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, created_at',
      [name, email, id]
    );
    return rows[0] || null;
  },

  /**
   * Elimina un usuario. ON DELETE CASCADE en la BD propaga la eliminación
   * automáticamente a sus refresh_tokens y favorites.
   *
   * @param {number|string} id
   * @returns {Promise<{id: number}|null>}
   */
  async delete(id) {
    const { rows } = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    return rows[0] || null;
  },
};

module.exports = UserModel;
