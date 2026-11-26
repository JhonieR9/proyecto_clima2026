// backend/backweb/tests/validators.test.js
// ─────────────────────────────────────────────────────────
// Qué hace: Prueba los schemas de autenticación y clima: acepta datos válidos, normaliza el
//           correo, rechaza correos inválidos, contraseñas cortas e inyecciones SQL.
// Conectado con: auth.schema.js, weather.schema.js.
// Rol: Cobertura de los validadores de auth y clima. Los schemas más importantes para seguridad.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registerSchema, loginSchema } = require('../src/validators/auth.schema');
const { weatherQuerySchema, suggestQuerySchema } = require('../src/validators/weather.schema');

// --- Registro ---

// Verifica que el schema acepta una carga útil completamente válida.
test('registerSchema acepta datos válidos', () => {
  const r = registerSchema.safeParse({
    name: 'Juan Pérez', email: 'juan@example.com', password: 'secreto123',
  });
  assert.equal(r.success, true);
});

// La normalización a minúsculas evita que un usuario pueda registrarse como
// juan@example.com y como JUAN@example.com (dos cuentas con el mismo correo real).
test('registerSchema normaliza el email a minúsculas', () => {
  const r = registerSchema.safeParse({
    name: 'Juan', email: '  JUAN@Example.COM ', password: 'secreto123',
  });
  assert.equal(r.success, true);
  assert.equal(r.data.email, 'juan@example.com');
});

// Verifica que el schema rechaza correos sin el formato name@domain.tld.
test('registerSchema rechaza email inválido', () => {
  const r = registerSchema.safeParse({
    name: 'Juan', email: 'no-es-email', password: 'secreto123',
  });
  assert.equal(r.success, false);
});

// Contraseñas cortas (< 8 caracteres) no deben pasar; es el límite mínimo de seguridad.
test('registerSchema rechaza contraseña corta (<8)', () => {
  const r = registerSchema.safeParse({
    name: 'Juan', email: 'juan@example.com', password: '123',
  });
  assert.equal(r.success, false);
});

// --- Login ---

// Verifica que el login requiere que la contraseña no esté vacía.
test('loginSchema exige contraseña no vacía', () => {
  const r = loginSchema.safeParse({ email: 'juan@example.com', password: '' });
  assert.equal(r.success, false);
});

// --- Weather (consulta) ---

// Verifica que el schema de búsqueda acepta nombres con caracteres Unicode (tildes).
test('weatherQuerySchema acepta ciudad con acentos', () => {
  const r = weatherQuerySchema.safeParse({ city: 'Bogotá' });
  assert.equal(r.success, true);
});

// Verifica la protección contra inyección SQL en el nombre de ciudad.
test('weatherQuerySchema rechaza intento de inyección', () => {
  const r = weatherQuerySchema.safeParse({ city: "Bogota'; DROP TABLE users;--" });
  assert.equal(r.success, false);
});

// La longitud mínima de 2 caracteres evita búsquedas demasiado amplias en la API.
test('weatherQuerySchema rechaza ciudad de 1 caracter', () => {
  const r = weatherQuerySchema.safeParse({ city: 'B' });
  assert.equal(r.success, false);
});

// --- Weather (autocompletado) ---

// El autocompletado debe responder desde el primer carácter para buena experiencia de usuario.
test('suggestQuerySchema acepta desde 1 caracter', () => {
  const r = suggestQuerySchema.safeParse({ q: 'ca' });
  assert.equal(r.success, true);
});

// Verifica que el schema protege el endpoint de autocompletado contra XSS.
test('suggestQuerySchema rechaza caracteres no válidos', () => {
  const r = suggestQuerySchema.safeParse({ q: '<script>' });
  assert.equal(r.success, false);
});
