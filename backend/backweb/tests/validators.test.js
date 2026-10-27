// backend/backweb/tests/validators.test.js
// Pruebas de los schemas de validación (Zod): aceptan datos válidos y rechazan
// entradas inválidas o potencialmente maliciosas.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registerSchema, loginSchema } = require('../src/validators/auth.schema');
const { weatherQuerySchema, suggestQuerySchema } = require('../src/validators/weather.schema');

// --- Registro ---
test('registerSchema acepta datos válidos', () => {
  const r = registerSchema.safeParse({
    name: 'Juan Pérez', email: 'juan@example.com', password: 'secreto123',
  });
  assert.equal(r.success, true);
});

test('registerSchema normaliza el email a minúsculas', () => {
  const r = registerSchema.safeParse({
    name: 'Juan', email: '  JUAN@Example.COM ', password: 'secreto123',
  });
  assert.equal(r.success, true);
  assert.equal(r.data.email, 'juan@example.com');
});

test('registerSchema rechaza email inválido', () => {
  const r = registerSchema.safeParse({
    name: 'Juan', email: 'no-es-email', password: 'secreto123',
  });
  assert.equal(r.success, false);
});

test('registerSchema rechaza contraseña corta (<8)', () => {
  const r = registerSchema.safeParse({
    name: 'Juan', email: 'juan@example.com', password: '123',
  });
  assert.equal(r.success, false);
});

// --- Login ---
test('loginSchema exige contraseña no vacía', () => {
  const r = loginSchema.safeParse({ email: 'juan@example.com', password: '' });
  assert.equal(r.success, false);
});

// --- Weather (consulta) ---
test('weatherQuerySchema acepta ciudad con acentos', () => {
  const r = weatherQuerySchema.safeParse({ city: 'Bogotá' });
  assert.equal(r.success, true);
});

test('weatherQuerySchema rechaza intento de inyección', () => {
  const r = weatherQuerySchema.safeParse({ city: "Bogota'; DROP TABLE users;--" });
  assert.equal(r.success, false);
});

test('weatherQuerySchema rechaza ciudad de 1 caracter', () => {
  const r = weatherQuerySchema.safeParse({ city: 'B' });
  assert.equal(r.success, false);
});

// --- Weather (autocompletado) ---
test('suggestQuerySchema acepta desde 1 caracter', () => {
  const r = suggestQuerySchema.safeParse({ q: 'ca' });
  assert.equal(r.success, true);
});

test('suggestQuerySchema rechaza caracteres no válidos', () => {
  const r = suggestQuerySchema.safeParse({ q: '<script>' });
  assert.equal(r.success, false);
});
