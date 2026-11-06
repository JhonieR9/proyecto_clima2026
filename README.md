# ClimaApp 2026 — Proyecto de Grado

Aplicación web de consulta del clima con **sistema de caching multinivel**,
autenticación segura y ciudades favoritas por usuario. Compuesta por una API REST
(Node + Express + PostgreSQL) y una SPA (Vue 3 + TypeScript).

API meteorológica: [Open-Meteo](https://open-meteo.com) (gratuita, sin API key).

---

## Características

- **Autenticación de doble token**: access token en memoria + refresh token rotativo
  en cookie HttpOnly, con revocación de sesiones y detección de reuso.
- **Autorización RBAC/ABAC**: roles (`user`/`admin`) y propiedad de recursos.
- **Caché multinivel + Stale-While-Revalidate**:
  - L1: memoria del proceso.
  - L2: PostgreSQL.
  - Revalidación en segundo plano mediante una **cola de tareas en memoria**.
  - Insensible a acentos y mayúsculas ("Bogota" = "Bogotá").
- **Autocompletado de ciudades** con priorización de Colombia.
- **Ciudades favoritas por usuario**, persistidas en la base de datos.
- **Diseño dinámico**: ícono animado y fondo que cambian según el clima.
- **Resiliencia**: manejo global de errores, logs estructurados con
  `x-correlation-id`, rate limiting, validación con Zod, reintentos automáticos
  en Axios y transacciones ACID.
- **27 tests automatizados** en el backend.

---

## Arquitectura

```
Request
  → Middlewares (correlation-id → rate-limit → validación Zod → auth/RBAC)
  → Controlador (HTTP ↔ servicio)
  → Servicio    (lógica de negocio)
  → Modelo      (acceso a PostgreSQL)
```

```
proyecto_clima2026/
├── backend/backweb/        # API REST (Express + PostgreSQL)
│   └── src/
│       ├── config/         # db, migraciones, swagger
│       ├── controllers/    # auth, user, weather, favorite
│       ├── services/       # auth, weather
│       ├── models/         # user, refreshToken, weatherCache, favorite
│       ├── middlewares/    # auth, validación, rate limit, errores, correlation-id
│       ├── validators/     # schemas Zod
│       ├── routes/         # endpoints + Swagger
│       ├── utils/          # token (JWT), AppError, logger, taskQueue
│       └── index.js        # composición de la app
│   └── tests/              # 27 tests (node:test)
└── frontend/               # SPA (Vue 3 + TypeScript + Vite)
    └── src/
        ├── views/          # login, registro, buscador, resultado, 404
        ├── components/     # caja de búsqueda, insignia, ícono del clima, coordenadas
        ├── stores/         # Pinia: auth, weather, favorite
        ├── services/       # Axios tipado: http, auth, weather, favorite
        └── utils/          # tema del clima
```

---

## Stack

| Capa | Tecnologías |
|------|-------------|
| Backend | Node.js, Express, PostgreSQL (`pg`), JWT, bcrypt, Zod, Helmet, Swagger |
| Frontend | Vue 3, TypeScript, Vite, Pinia, Vue Router, Axios |
| Pruebas | `node:test` (runner nativo de Node) |

---

## Requisitos

- Node.js 18+ (probado en v24)
- PostgreSQL 14+
- Una base de datos creada (por defecto `backweb_db`)

---

## Puesta en marcha

### 1. Base de datos

Crea la base en PostgreSQL (las tablas se crean solas al arrancar el backend):

```sql
CREATE DATABASE backweb_db;
```

### 2. Backend

```bash
cd backend/backweb
npm install
cp .env.example .env     # editar credenciales DB_* y los secretos JWT_*
npm run dev              # desarrollo (nodemon)
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api-docs`

Variables de entorno (ver `.env.example`): `DB_*` (PostgreSQL),
`JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` (cadenas largas y distintas),
`BCRYPT_ROUNDS`, límites de rate limit.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev              # Vite → http://localhost:5173
```

---

## Usuario administrador (RBAC)

El registro público crea usuarios con rol `user`. Para tener un administrador
(y poder probar el control de acceso por rol), ejecuta:

```bash
cd backend/backweb
npm run seed:admin
```

Crea el admin con las credenciales de `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`;
por defecto `admin@clima.com` / `Admin12345`). Un admin puede acceder a
`GET /api/users`; un usuario normal recibe `403 Forbidden`.

## Pruebas

```bash
cd backend/backweb
npm test                 # ejecuta la suite (node:test)
```

Cubren la cola de tareas, la normalización de ciudad, la priorización de Colombia
y los validadores Zod.

---

## Endpoints principales

| Método | Ruta | Protección | Descripción |
|--------|------|-----------|-------------|
| POST | `/api/auth/register` | rate limit | Registro de usuario |
| POST | `/api/auth/login` | rate limit | Login (access + cookie refresh) |
| POST | `/api/auth/refresh` | cookie | Rota el refresh token |
| POST | `/api/auth/logout` | cookie | Cierra sesión |
| GET | `/api/auth/me` | Bearer | Perfil del usuario autenticado |
| GET | `/api/weather?city=` | — | Clima con caché multinivel + SWR |
| GET | `/api/weather/suggest?q=` | — | Autocompletado de ciudades |
| GET | `/api/favorites` | Bearer | Lista las favoritas del usuario |
| POST | `/api/favorites` | Bearer | Agrega una favorita |
| DELETE | `/api/favorites/:id` | Bearer | Elimina una favorita |

Formato de respuesta de error:

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." }, "correlationId": "..." }
```

---

## Estados del caché (campo `source`)

| Valor | Significado |
|-------|-------------|
| `memory` | Servido desde la caché en memoria (L1) |
| `cache` | Servido desde PostgreSQL (L2), dato fresco |
| `stale` | Dato antiguo servido al instante; se revalida en segundo plano |
| `api_fresh` | Consultado directamente a Open-Meteo |
| `stale_fallback` | La API falló; se devolvió el último dato conocido |

---

## Seguridad

- Contraseñas con bcrypt (12 rounds).
- Access token en memoria (nunca en localStorage); refresh en cookie HttpOnly,
  SameSite=Strict, Secure en producción.
- Queries parametrizadas (anti SQLi) y validación estricta con Zod (anti XSS).
- El archivo `.env` está en `.gitignore` y nunca se versiona.
