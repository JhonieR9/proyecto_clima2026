// backend/backweb/tests/weather.logic.test.js
// ─────────────────────────────────────────────────────────
// Qué hace: Prueba cityKeyOf (quita acentos, minúsculas, recorta espacios) y orderSuggestions
//           (Colombia primero, reconoce código MX, preserva el orden interno).
// Conectado con: weather.service.js (las funciones que prueba).
// Rol: Verifica que Bogota y Bogotá sean la misma clave de caché. La corrección más importante.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cityKeyOf, orderSuggestions } = require('../src/services/weather.service');

// Verifica la normalización básica: tildes eliminadas y conversión a minúsculas.
test('cityKeyOf quita acentos y pasa a minúsculas', () => {
  assert.equal(cityKeyOf('Bogotá'), 'bogota');
  assert.equal(cityKeyOf('Medellín'), 'medellin');
  assert.equal(cityKeyOf('BOGOTA'), 'bogota');
});

// Este test es el más crítico: garantiza que "Bogota" y "Bogotá" caigan
// en la misma entrada de caché y no generen dos filas distintas en la BD.
test('cityKeyOf iguala variantes con y sin tilde', () => {
  assert.equal(cityKeyOf('Bogota'), cityKeyOf('Bogotá'));
  assert.equal(cityKeyOf('  BOGOTÁ  '), 'bogota');
});

// Los espacios sobrantes antes y después deben eliminarse para evitar
// duplicados como "cali" y " cali " en la misma caché.
test('cityKeyOf recorta espacios sobrantes', () => {
  assert.equal(cityKeyOf('  Cali '), 'cali');
});

// Verifica que las ciudades colombianas suben al inicio del desplegable
// cuando se detectan por el campo country.
test('orderSuggestions pone Colombia primero (por country)', () => {
  const input = [
    { name: 'Cali', country: 'Turquía' },
    { name: 'Cali', country: 'Colombia' },
    { name: 'Cali', country: 'Filipinas' },
  ];
  const out = orderSuggestions(input);
  assert.equal(out[0].country, 'Colombia');
});

// Verifica que la detección de Colombia también funciona por country_code 'CO',
// ya que la API puede devolver el campo en cualquiera de las dos formas.
test('orderSuggestions reconoce Colombia por country_code CO', () => {
  const input = [
    { name: 'X', country_code: 'US' },
    { name: 'Y', country_code: 'CO' },
  ];
  const out = orderSuggestions(input);
  assert.equal(out[0].country_code, 'CO');
});

// Verifica la estabilidad del sort: las ciudades colombianas deben mantener
// su orden relativo entre ellas (la que venía primero sigue primero).
test('orderSuggestions es estable dentro de cada grupo', () => {
  // Dos de Colombia en cierto orden: debe conservarse entre ellas.
  const input = [
    { name: 'Primera', country: 'Colombia' },
    { name: 'Otra', country: 'México' },
    { name: 'Segunda', country: 'Colombia' },
  ];
  const out = orderSuggestions(input);
  assert.equal(out[0].name, 'Primera');
  assert.equal(out[1].name, 'Segunda');
  assert.equal(out[2].name, 'Otra');
});

// La función debe manejar listas vacías sin lanzar excepciones.
test('orderSuggestions no rompe con lista vacía', () => {
  assert.deepEqual(orderSuggestions([]), []);
});
