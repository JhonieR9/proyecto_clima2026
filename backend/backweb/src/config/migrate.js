const pool = require('./db');

// Agrega columnas aquí para que se creen automáticamente al arrancar
const schema = [
  {
    table: 'users',
    create: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'name',       def: 'VARCHAR(100) NOT NULL' },
      { name: 'email',      def: 'VARCHAR(150)' },
      { name: 'password',   def: 'VARCHAR(255) NOT NULL' },
      // RBAC: rol del usuario ('user' | 'admin')
      { name: 'role',       def: "VARCHAR(20) NOT NULL DEFAULT 'user'" },
      { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
  {
    // Refresh tokens persistidos para rotación y revocación de sesiones.
    // CORE: "Refresh Token rotativo ... con revocación de sesiones concurrentes".
    table: 'refresh_tokens',
    create: `
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        jti UUID UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'jti',        def: 'UUID' },
      { name: 'user_id',    def: 'INTEGER' },
      { name: 'revoked',    def: 'BOOLEAN NOT NULL DEFAULT FALSE' },
      { name: 'expires_at', def: 'TIMESTAMP' },
      { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
  {
    table: 'weather_cache',
    create: `
      CREATE TABLE IF NOT EXISTS weather_cache (
        id SERIAL PRIMARY KEY,
        city VARCHAR(150) UNIQUE NOT NULL,
        latitude NUMERIC(9,6) NOT NULL,
        longitude NUMERIC(9,6) NOT NULL,
        temperature NUMERIC(5,2) NOT NULL,
        condition_text VARCHAR(100) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    columns: [
      { name: 'city',           def: 'VARCHAR(150) UNIQUE NOT NULL' },
      { name: 'latitude',       def: 'NUMERIC(9,6) NOT NULL' },
      { name: 'longitude',      def: 'NUMERIC(9,6) NOT NULL' },
      { name: 'temperature',    def: 'NUMERIC(5,2) NOT NULL' },
      { name: 'condition_text', def: 'VARCHAR(100) NOT NULL' },
      { name: 'updated_at',     def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
    ],
  },
];

async function runMigrations() {
  for (const entry of schema) {
    await pool.query(entry.create);

    const { rows } = await pool.query(
      'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
      [entry.table]
    );
    const existing = rows.map((r) => r.column_name);

    for (const col of entry.columns) {
      if (!existing.includes(col.name)) {
        await pool.query(`ALTER TABLE ${entry.table} ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`);
        console.log(`Columna añadida: ${entry.table}.${col.name}`);
      }
    }

    console.log(`Tabla lista: ${entry.table}`);
  }
}

module.exports = runMigrations;
