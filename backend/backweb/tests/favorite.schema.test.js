// backend/backweb/tests/favorite.schema.test.js
// Pruebas del validador para agregar ciudad favorita.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { addFavoriteSchema } = require('../src/validators/favorite.schema');

test('addFavoriteSchema acepta solo la ciudad', () => {
  const r = addFavoriteSchema.safeParse({ city: 'Cali' });
  assert.equal(r.success, true);
});

test('addFavoriteSchema acepta ciudad con coordenadas', () => {
  const r = addFavoriteSchema.safeParse({ city: 'Bogotá', latitude: 4.61, longitude: -74.08 });
  assert.equal(r.success, true);
});

test('addFavoriteSchema rechaza ciudad vacía', () => {
  const r = addFavoriteSchema.safeParse({ city: '' });
  assert.equal(r.success, false);
});

test('addFavoriteSchema rechaza caracteres maliciosos', () => {
  const r = addFavoriteSchema.safeParse({ city: '<script>' });
  assert.equal(r.success, false);
});

test('addFavoriteSchema rechaza latitud fuera de rango', () => {
  const r = addFavoriteSchema.safeParse({ city: 'Cali', latitude: 200, longitude: 0 });
  assert.equal(r.success, false);
});
