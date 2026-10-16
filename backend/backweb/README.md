# BackWeb — API de Clima con Seguridad y Caching

API REST en Express + PostgreSQL que implementa el **Estándar Técnico Obligatorio (CORE)**:
seguridad con doble token, autorización RBAC/ABAC, arquitectura limpia por capas,
resiliencia y una estrategia de caching multinivel para el consumo meteorológico.

---

## 1. Arquitectura (Arquitectura Limpia + SOLID)

Separación estricta por capas. Cada petición fluye así:

```
Request
  → Middlewares (correlation-id, rate-limit, validación Zod, auth/RBAC)
  → Controlador (traduce HTTP ↔ servicio)
  → Servicio (lógica de negocio)
  → Repositorio / Modelo (acceso a PostgreSQL)
```

```
src/
├── index.js                      # Composición de la app y middlewares globales
├── config/
│   ├── db.js                     # Pool de PostgreSQL (pg)
│   ├── migrate.js                # Migraciones idempotentes al arrancar
│   └── swagger.js                # OpenAPI
├── controllers/                  # Solo HTTP ↔ servicio
│   ├── auth.controller.js
│   ├── user.controller.js
│   └── weather.controller.js
├── services/                     # Lógica de negocio
│   ├── auth.service.js
│   └── weather.service.js        # Caching L1+L2 + Stale-While-Revalidate
├── models/                       # Repositorios (acceso a datos)
│   ├── user.model.js
│   ├── refreshToken.model.js
│   └── weatherCache.model.js
├── middlewares/
│   ├── auth.middleware.js        # authenticate, authorize (RBAC), ownership (ABAC)
│   ├── validate.middleware.js    # Validación con Zod
│   ├── rateLimit.middleware.js   # Rate limiting
│   ├── correlationId.middleware.js
│   └── error.middleware.js       # Manejo global de excepciones
├── validators/                   # Schemas Zod
│   ├── auth.schema.js
│   └── weather.schema.js
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   └── weather.routes.js
└── utils/
    ├── token.js                  # Firma/verificación de JWT
    ├── AppError.js               # Error tipado con statusCode
    └── logger.js                 # Logs estructurados (JSON)
```

---

## 2. Seguridad & Acceso

### Autenticación — Doble token
- **Access token** (JWT, vida corta ~15 min): se devuelve en el body del login.
  El frontend lo guarda **en memoria** (no en localStorage) y lo envía en
  `Authorization: Bearer <token>`.
- **Refresh token** (JWT, vida larga ~7 días): viaja en **cookie HttpOnly, Secure
  (en producción), SameSite=Strict**, limitada al path `/api/auth`.
- **Rotativo**: cada `POST /api/auth/refresh` revoca el token usado (por su `jti`)
  y emite uno nuevo. Si se detecta **reuso de un token revocado**, se revocan
  **todas** las sesiones del usuario (defensa ante robo de token).
- **Revocación de sesiones**: la tabla `refresh_tokens` permite invalidar sesiones
  concurrentes (`revokeAllForUser`).

### Autorización — RBAC + ABAC (resource ownership)
- `authenticate`: exige access token válido.
- `authorize('admin', ...)`: RBAC por rol a nivel de endpoint.
- `authorizeSelfOrAdmin('id')`: ABAC, permite el acceso solo al dueño del recurso
  o a un admin.

### Cifrado y validación
- Contraseñas hasheadas con **bcrypt**.
- Validación estricta con **Zod** en cada endpoint (body/query).
- **Rate limiting** general y reforzado en login/registro (anti fuerza bruta).
- Cabeceras seguras con **helmet**; queries **parametrizadas** (anti SQLi);
  el nombre de ciudad se valida por regex (anti XSS/inyección).

---

## 3. Resiliencia
- **Manejo global de excepciones** (`error.middleware.js`): toda la app responde
  con el mismo formato `{ success, error: { code, message }, correlationId }`.
- **Logs estructurados en JSON** con **x-correlation-id** por request, para trazar
  una petición de punta a punta.
- `AppError` tipado con `statusCode` y `code` semántico.

---

## 4. Consumo Meteorológico — Caching multinivel + SWR

`weather.service.js` implementa la estrategia prometida:

| Nivel | Dónde | Para qué |
|-------|-------|----------|
| **L1** | `Map` en memoria del proceso | Cero latencia en hits calientes (TTL 30 min) |
| **L2** | Tabla `weather_cache` en PostgreSQL | Persistencia entre reinicios |

Umbrales de frescura (**Stale-While-Revalidate**):

- **FRESH** (≤ 30 min): se sirve directo. `source: cache` / `memory`.
- **STALE** (30 min – 24 h): se sirve **al instante** y se **revalida en segundo
  plano** contra Open-Meteo. `source: stale`.
- **EXPIRADO** (> 24 h) o sin caché: se consulta la API. `source: api_fresh`.

**Tolerancia a caídas**: si Open-Meteo falla pero existe un dato previo (aunque
esté viejo), se devuelve ese dato (`source: stale_fallback`) en vez de un error.
Si no hay dato previo y la API está caída, se responde `503`.

Flujo:

```
Request "Bogotá"
  ├─ L1 memoria ¿FRESH? ───────────► source: memory  ⚡
  ├─ L2 Postgres
  │     ├─ FRESH  ─────────────────► source: cache
  │     └─ STALE  ─────────────────► source: stale  (+ revalida en 2º plano)
  └─ EXPIRADO / sin caché
        ├─ API OK   ────────────────► source: api_fresh
        └─ API falla + hay dato viejo ► source: stale_fallback
        └─ API falla + sin dato ──────► 503
```

API pública usada: **Open-Meteo** (geocoding + forecast), gratuita y sin API key.

---

## 5. Endpoints

### Auth (`/api/auth`)
| Método | Ruta | Descripción | Protección |
|--------|------|-------------|-----------|
| POST | `/register` | Registro público | rate limit |
| POST | `/login` | Login (devuelve access + cookie refresh) | rate limit |
| POST | `/refresh` | Rota el refresh y entrega nuevo access | cookie |
| POST | `/logout` | Revoca el refresh actual | cookie |
| GET  | `/me` | Datos del usuario autenticado | Bearer |

### Users (`/api/users`) — requieren Bearer
| Método | Ruta | Protección |
|--------|------|-----------|
| GET | `/` | admin |
| GET | `/:id` | dueño o admin |
| POST | `/` | admin |
| PUT | `/:id` | dueño o admin |
| DELETE | `/:id` | admin |

### Weather (`/api/weather`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/?city=Bogota` | Clima con caché multinivel + SWR |

Documentación interactiva: **`/api-docs`** (Swagger).

---

## 6. Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
#   -> editar DB_* y los secretos JWT_*

# 3. Levantar (ejecuta migraciones automáticamente)
npm run dev     # desarrollo con nodemon
npm start       # producción
```

### Variables de entorno clave
Ver `.env.example`. Importantes: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
(cadenas largas y distintas), y las credenciales `DB_*` de PostgreSQL.

> La base se administra con **DBeaver** apuntando a la misma instancia de
> PostgreSQL. Las tablas `users`, `refresh_tokens` y `weather_cache` se crean
> solas al arrancar gracias a `migrate.js`.

---

## 7. Cumplimiento del CORE — resumen

| Requisito del estándar | Implementación |
|------------------------|----------------|
| Doble token (access memoria + refresh rotativo cookie segura) | `token.js`, `auth.service.js`, `auth.controller.js` |
| Revocación de sesiones concurrentes | `refreshToken.model.js` |
| RBAC/ABAC + resource ownership | `auth.middleware.js` |
| Hashing de contraseñas | bcrypt en `user.model.js` |
| Validación con schemas (Zod) | `validators/`, `validate.middleware.js` |
| Rate limiting / anti XSS-SQLi | `rateLimit.middleware.js`, helmet, queries parametrizadas |
| Arquitectura limpia por capas + SOLID | `controllers/`, `services/`, `models/` |
| PostgreSQL + migraciones | `config/db.js`, `config/migrate.js` |
| Manejo global de excepciones | `error.middleware.js`, `AppError.js` |
| Logs estructurados con x-correlation-id | `logger.js`, `correlationId.middleware.js` |
| Caching multinivel L1+L2 + SWR + tolerancia a caídas | `services/weather.service.js` |
