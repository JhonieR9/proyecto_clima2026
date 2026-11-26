// backend/backweb/tests/favorite.schema.test.js
// ─────────────────────────────────────────────────────────
// Qué hace: Prueba el schema de favoritas: acepta ciudad válida con/sin coordenadas,
//           rechaza ciudad vacía, caracteres maliciosos y latitud fuera de rango.
// Conectado con: favorite.schema.js (el schema que prueba).
// Rol: Cobertura del validador de favoritas. Verifica que la protección de entrada funciona.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { addFavoriteSchema } = require('../src/validators/favorite.schema');

// Caso básico: las coordenadas son opcionales y no deben ser requeridas.
test('addFavoriteSchema acepta solo la ciudad', () => {
  const r = addFavoriteSchema.safeParse({ city: 'Cali' });
  assert.equal(r.success, true);
});

// Cuando el frontend envía las coordenadas del autocompletado, deben aceptarse.
test('addFavoriteSchema acepta ciudad con coordenadas', () => {
  const r = addFavoriteSchema.safeParse({ city: 'Bogotá', latitude: 4.61, longitude: -74.08 });
  assert.equal(r.success, true);
});

// Una ciudad vacía no debe pasar la validación (mínimo 2 caracteres).
test('addFavoriteSchema rechaza ciudad vacía', () => {
  const r = addFavoriteSchema.safeParse({ city: '' });
  assert.equal(r.success, false);
});

// Verifica la protección contra XSS en el nombre de la ciudad favorita.
test('addFavoriteSchema rechaza caracteres maliciosos', () => {
  const r = addFavoriteSchema.safeParse({ city: '<script>' });
  assert.equal(r.success, false);
});

// La latitud debe estar entre -90 y 90; un valor de 200 no es una latitud válida.
test('addFavoriteSchema rechaza latitud fuera de rango', () => {
  const r = addFavoriteSchema.safeParse({ city: 'Cali', latitude: 200, longitude: 0 });
  assert.equal(r.success, false);
});
