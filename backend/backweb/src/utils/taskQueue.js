// backend/backweb/src/utils/taskQueue.js
// Cola de tareas en memoria para trabajo asíncrono en segundo plano.
// CORE: "colas en memoria/Redis para tareas asíncronas".
//
// Características:
//   - Concurrencia limitada (procesa N tareas a la vez, no todas de golpe).
//   - De-duplicación por clave: si una tarea con la misma clave ya está en la
//     cola o ejecutándose, no se encola de nuevo (evita revalidaciones repetidas).
//   - Reintentos con backoff ante fallo transitorio.
//   - Logs estructurados con correlationId para trazabilidad.
//
// Es una alternativa en memoria (sin dependencias) a una cola tipo Redis/Bull.
// Para producción multi-instancia se sustituiría por Redis, pero la interfaz
// (enqueue) quedaría igual.
const logger = require('../utils/logger');

class TaskQueue {
  /**
   * @param {object} [opts]
   * @param {number} [opts.concurrency=2] Tareas ejecutándose en paralelo.
   * @param {number} [opts.maxRetries=2]  Reintentos por tarea ante fallo.
   * @param {number} [opts.baseDelayMs=500] Backoff base entre reintentos.
   * @param {string} [opts.name='queue']  Nombre para los logs.
   */
  constructor({ concurrency = 2, maxRetries = 2, baseDelayMs = 500, name = 'queue' } = {}) {
    this.concurrency = concurrency;
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.name = name;

    this.queue = [];            // tareas pendientes: { key, run, correlationId, attempt }
    this.active = 0;            // tareas ejecutándose ahora
    this.known = new Set();     // claves en cola o en ejecución (de-duplicación)
  }

  /**
   * Encola una tarea. Si ya hay una con la misma `key` pendiente o activa,
   * se ignora (devuelve false).
   * @param {string} key                Identificador para de-duplicar.
   * @param {() => Promise<void>} run    Trabajo asíncrono a ejecutar.
   * @param {object} [meta]
   * @param {string} [meta.correlationId]
   * @returns {boolean} true si se encoló, false si ya existía.
   */
  enqueue(key, run, { correlationId } = {}) {
    if (this.known.has(key)) {
      logger.info('queue.task_deduplicated', { queue: this.name, key, correlationId });
      return false;
    }
    this.known.add(key);
    this.queue.push({ key, run, correlationId, attempt: 0 });
    logger.info('queue.task_enqueued', {
      queue: this.name, key, correlationId, pending: this.queue.length,
    });
    this._drain();
    return true;
  }

  // Lanza tantas tareas como permita la concurrencia.
  _drain() {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      this._process(task);
    }
  }

  async _process(task) {
    this.active += 1;
    try {
      await task.run();
      logger.info('queue.task_done', {
        queue: this.name, key: task.key, correlationId: task.correlationId,
      });
      this.known.delete(task.key);
    } catch (err) {
      if (task.attempt < this.maxRetries) {
        task.attempt += 1;
        const wait = this.baseDelayMs * 2 ** (task.attempt - 1);
        logger.warn('queue.task_retry', {
          queue: this.name, key: task.key, attempt: task.attempt,
          waitMs: wait, reason: err.message, correlationId: task.correlationId,
        });
        // Reprograma el reintento sin bloquear el slot actual.
        setTimeout(() => {
          this.queue.push(task);
          this._drain();
        }, wait);
      } else {
        logger.error('queue.task_failed', {
          queue: this.name, key: task.key, reason: err.message,
          correlationId: task.correlationId,
        });
        this.known.delete(task.key);
      }
    } finally {
      this.active -= 1;
      this._drain();
    }
  }

  /** Estado actual de la cola (útil para health checks / tests). */
  stats() {
    return { pending: this.queue.length, active: this.active, tracked: this.known.size };
  }
}

module.exports = TaskQueue;
