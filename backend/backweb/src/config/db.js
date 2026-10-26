const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Error en el pool de PostgreSQL:', err);
});

/**
 * Ejecuta `fn` dentro de una transacción ACID.
 * Hace BEGIN, pasa el cliente a `fn`, y COMMIT si todo va bien o ROLLBACK si
 * algo lanza. Siempre libera el cliente al pool.
 *
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
pool.withTransaction = async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_rollbackErr) {
      // Si el ROLLBACK falla, propagamos el error original de todos modos.
    }
    throw err;
  } finally {
    client.release();
  }
};

module.exports = pool;
