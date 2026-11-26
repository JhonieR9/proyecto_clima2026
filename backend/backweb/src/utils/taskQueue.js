// backend/backweb/src/utils/taskQueue.js
// ─────────────────────────────────────────────────────────
// Qué hace: Implementa una cola de tareas en memoria con concurrencia configurable.
//           De-duplica por clave (si ya hay una tarea pendiente con la misma clave, la ignora)
//           y reintenta con backoff exponencial ante fallos. Alternativa en memoria a Redis/Bull.
// Conectado con: logger.js (registra enqueue, done, retry y fail), weather.service.js (cola SWR).
// Rol: Infraestructura de trabajo asíncrono. Las revalidaciones del clima no bloquean al usuario.
//
// Es una alternativa en memoria (sin dependencias) a una cola tipo Redis/Bull.
// Para producción multi-instancia se sustituiría por Redis, pero la interfaz
// (enqueue) quedaría igual.
const logger = require('../utils/logger');

class TaskQueue {
  /**
   * @param {object} [opts]
   * @param {number} [opts.concurrency=2]   Máximo de tareas ejecutándose a la vez.
   * @param {number} [opts.maxRetries=2]    Reintentos máximos por tarea ante fallo.
   * @param {number} [opts.baseDelayMs=500] Espera base del backoff exponencial.
   * @param {string} [opts.name='queue']    Nombre para identificar la cola en los logs.
   */
  constructor({ concurrency = 2, maxRetries = 2, baseDelayMs = 500, name = 'queue' } = {}) {
    this.concurrency = concurrency;
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.name = name;

    this.queue = [];            // tareas pendientes: { key, run, correlationId, attempt }
    this.active = 0;            // tareas ejecutándose en este momento
    this.known = new Set();     // claves en cola o en ejecución (para de-duplicación)
  }

  /**
   * Encola una tarea asíncrona identificada por una clave.
   * Si ya hay una tarea con esa clave (pendiente o activa), la ignora y devuelve false.
   * Este comportamiento es el corazón del patrón SWR: si ya hay una revalidación
   * en curso para "bogota", no lanzamos otra, evitando sobrecarga en Open-Meteo.
   *
   * @param {string} key                 Identificador único para de-duplicar (p. ej. cityKey).
   * @param {() => Promise<void>} run    Función asíncrona a ejecutar.
   * @param {object} [meta]
   * @param {string} [meta.correlationId]
   * @returns {boolean} true si se encoló, false si ya existía una con la misma clave.
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

  /**
   * Arranca tantas tareas como permita la concurrencia disponible.
   * Se llama cada vez que se encola una tarea nueva o se libera un slot.
   *
   * @private
   */
  // Lanza tantas tareas como permita la concurrencia.
  _drain() {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      this._process(task);
    }
  }

  /**
   * Ejecuta una tarea y gestiona los reintentos con backoff exponencial.
   * - Si tiene éxito: libera la clave y el slot de concurrencia.
   * - Si falla y quedan reintentos: re-encola con setTimeout (backoff).
   * - Si agota reintentos: loguea el fallo y libera la clave.
   * El finally siempre decrementa active y llama a _drain para mantener
   * el flujo sin importar si la tarea tuvo éxito o no.
   *
   * @private
   * @param {{ key: string, run: Function, correlationId: string, attempt: number }} task
   */
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
        // Backoff exponencial: 500ms, 1000ms, 2000ms... para no saturar la API externa.
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
      // Libera el slot independientemente del resultado para que _drain pueda
      // arrancar la siguiente tarea sin esperar a que el setTimeout se dispare.
      this.active -= 1;
      this._drain();
    }
  }

  /**
   * Devuelve estadísticas instantáneas de la cola.
   * Útil para el endpoint /health y para los tests de concurrencia.
   *
   * @returns {{ pending: number, active: number, tracked: number }}
   */
  stats() {
    return { pending: this.queue.length, active: this.active, tracked: this.known.size };
  }
}

module.exports = TaskQueue;
