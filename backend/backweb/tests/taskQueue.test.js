// backend/backweb/tests/taskQueue.test.js
// ─────────────────────────────────────────────────────────
// Qué hace: Prueba la cola de tareas con 5 casos: que ejecute, de-duplique por clave,
//           permita re-encolar tras completarse, respete la concurrencia y reintente ante fallos.
// Conectado con: taskQueue.js (la clase que prueba).
// Rol: Cobertura de la cola. Verifica las tres garantías clave: ejecución, deduplicación y reintentos.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const TaskQueue = require('../src/utils/taskQueue');

const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));

// Caso base: una tarea encolada debe ejecutarse antes de que expire el tick.
test('ejecuta una tarea encolada', async () => {
  const q = new TaskQueue({ name: 'test', concurrency: 1 });
  let ran = false;
  q.enqueue('a', async () => { ran = true; });
  await tick(30);
  assert.equal(ran, true);
});

// La deduplicación por clave evita que múltiples peticiones de la misma ciudad
// lancen múltiples revalidaciones a Open-Meteo al mismo tiempo.
test('de-duplica tareas con la misma clave', async () => {
  const q = new TaskQueue({ name: 'test', concurrency: 1 });
  let count = 0;
  const slow = async () => { await tick(20); count += 1; };

  const first = q.enqueue('ciudad', slow);
  const second = q.enqueue('ciudad', slow); // misma clave: debe ignorarse

  assert.equal(first, true, 'la primera se encola');
  assert.equal(second, false, 'la segunda (misma clave) se rechaza');

  await tick(60);
  assert.equal(count, 1, 'solo corre una vez');
});

// Una vez que la tarea termina, la clave debe liberarse para permitir nuevas búsquedas
// de la misma ciudad en el futuro (ej. la siguiente consulta después de STALE_MS).
test('permite re-encolar una clave tras completarse', async () => {
  const q = new TaskQueue({ name: 'test', concurrency: 1 });
  let count = 0;
  q.enqueue('x', async () => { count += 1; });
  await tick(30);
  const again = q.enqueue('x', async () => { count += 1; });
  await tick(30);
  assert.equal(again, true, 'tras terminar, la clave se puede volver a encolar');
  assert.equal(count, 2);
});

// Verifica que la cola no excede la concurrencia configurada,
// lo cual protege a Open-Meteo de ser bombardeado.
test('respeta la concurrencia máxima', async () => {
  const q = new TaskQueue({ name: 'test', concurrency: 2 });
  let activeNow = 0;
  let maxSeen = 0;
  const job = async () => {
    activeNow += 1;
    maxSeen = Math.max(maxSeen, activeNow);
    await tick(30);
    activeNow -= 1;
  };
  ['a', 'b', 'c', 'd'].forEach((k) => q.enqueue(k, job));
  await tick(120);
  assert.ok(maxSeen <= 2, `nunca más de 2 a la vez (vio ${maxSeen})`);
});

// Verifica el mecanismo de reintentos: una tarea que falla en el primer intento
// debe reintentarse y tener éxito en el segundo. Esto protege ante caídas transitorias de la API.
test('reintenta una tarea que falla y luego acierta', async () => {
  const q = new TaskQueue({ name: 'test', concurrency: 1, maxRetries: 2, baseDelayMs: 5 });
  let attempts = 0;
  q.enqueue('retry', async () => {
    attempts += 1;
    if (attempts < 2) throw new Error('fallo transitorio');
  });
  await tick(80);
  assert.equal(attempts, 2, 'falla una vez y acierta al reintentar');
});
