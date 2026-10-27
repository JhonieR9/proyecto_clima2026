// backend/backweb/tests/weather.logic.test.js
// Pruebas de las funciones puras del servicio de clima:
//   - cityKeyOf: normalización de nombre de ciudad (clave de caché).
//   - orderSuggestions: priorización de Colombia en el autocompletado.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cityKeyOf, orderSuggestions } = require('../src/services/weather.service');

test('cityKeyOf quita acentos y pasa a minúsculas', () => {
  assert.equal(cityKeyOf('Bogotá'), 'bogota');
  assert.equal(cityKeyOf('Medellín'), 'medellin');
  assert.equal(cityKeyOf('BOGOTA'), 'bogota');
});

test('cityKeyOf iguala variantes con y sin tilde', () => {
  assert.equal(cityKeyOf('Bogota'), cityKeyOf('Bogotá'));
  assert.equal(cityKeyOf('  BOGOTÁ  '), 'bogota');
});

test('cityKeyOf recorta espacios sobrantes', () => {
  assert.equal(cityKeyOf('  Cali '), 'cali');
});

test('orderSuggestions pone Colombia primero (por country)', () => {
  const input = [
    { name: 'Cali', country: 'Turquía' },
    { name: 'Cali', country: 'Colombia' },
    { name: 'Cali', country: 'Filipinas' },
  ];
  const out = orderSuggestions(input);
  assert.equal(out[0].country, 'Colombia');
});

test('orderSuggestions reconoce Colombia por country_code CO', () => {
  const input = [
    { name: 'X', country_code: 'US' },
    { name: 'Y', country_code: 'CO' },
  ];
  const out = orderSuggestions(input);
  assert.equal(out[0].country_code, 'CO');
});

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

test('orderSuggestions no rompe con lista vacía', () => {
  assert.deepEqual(orderSuggestions([]), []);
});
