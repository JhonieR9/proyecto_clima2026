// backend/backweb/src/config/seedAdmin.js
// Crea (o asciende) un usuario administrador inicial.
// El registro público siempre crea rol 'user'; este script es la forma de
// tener un admin para demostrar el control de acceso por rol (RBAC).
//
// Uso:
//   npm run seed:admin
//
// Credenciales (configurables por variables de entorno):
//   ADMIN_EMAIL     (por defecto: admin@clima.com)
//   ADMIN_PASSWORD  (por defecto: Admin12345)
//   ADMIN_NAME      (por defecto: Administrador)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');
const runMigrations = require('./migrate');

const EMAIL = process.env.ADMIN_EMAIL || 'admin@clima.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'Admin12345';
const NAME = process.env.ADMIN_NAME || 'Administrador';
const ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

async function seedAdmin() {
  // Asegura que las tablas existan antes de insertar.
  await runMigrations();

  const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [EMAIL]);

  if (existing.rows.length > 0) {
    // Ya existe: si no es admin, lo ascendemos.
    const user = existing.rows[0];
    if (user.role === 'admin') {
      console.log(`El usuario ${EMAIL} ya es admin. Nada que hacer.`);
    } else {
      await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', user.id]);
      console.log(`Usuario ${EMAIL} ascendido a admin.`);
    }
  } else {
    // No existe: lo creamos con rol admin.
    const hashed = await bcrypt.hash(PASSWORD, ROUNDS);
    await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
      [NAME, EMAIL, hashed, 'admin']
    );
    console.log('Administrador creado:');
    console.log(`  email:    ${EMAIL}`);
    console.log(`  password: ${PASSWORD}`);
    console.log('  (cambia la contraseña tras el primer inicio de sesión)');
  }
}

seedAdmin()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error al crear el admin:', err.message);
    pool.end().finally(() => process.exit(1));
  });
