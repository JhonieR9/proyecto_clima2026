# Guía del código — ClimaApp

Esta guía explica **qué hace cada archivo** del proyecto y **cómo se conectan entre sí**.
Describe el código de la rama `main` con sus valores por defecto (por ejemplo, contraseña
mínima de 8 caracteres o 6 sugerencias de autocompletado).

---

## 1. Qué hace la aplicación

ClimaApp consulta el clima de una ciudad. El usuario se registra, inicia sesión, busca una
ciudad (con autocompletado) y ve temperatura, humedad y condición. Puede marcar ciudades
como favoritas y volver a consultarlas con un clic.

Dos aplicaciones separadas que se hablan por HTTP:

- **Backend** (`backend/backweb`): API REST en Node.js + Express con base de datos PostgreSQL.
  Autentica usuarios, guarda favoritas y obtiene el clima de **Open-Meteo**, usando una caché
  de dos niveles para llamar poco a esa API externa.
- **Frontend** (`frontend`): aplicación Vue 3 + TypeScript. Muestra las pantallas y llama al backend.

---

## 2. Mapa del proyecto

```
proyecto_clima2026/
├── README.md                        Presentación del proyecto
├── docs/GUIA_DEL_CODIGO.md          Esta guía
├── backend/backweb/
│   ├── package.json                 Dependencias y comandos (dev, start, test, seed:admin)
│   ├── .env.example                 Plantilla de variables de entorno
│   ├── src/
│   │   ├── index.js                 Arranque: arma la app y levanta el servidor
│   │   ├── config/                  db.js, migrate.js, seedAdmin.js, swagger.js
│   │   ├── middlewares/             Guardias que se ejecutan antes de los controladores
│   │   ├── routes/                  Qué URL llama a qué controlador
│   │   ├── validators/              Reglas de validación (Zod)
│   │   ├── controllers/             Reciben la petición y arman la respuesta
│   │   ├── services/                Lógica de negocio (auth y clima)
│   │   ├── models/                  Único lugar con consultas SQL
│   │   └── utils/                   AppError, logger, token, taskQueue
│   └── tests/                       27 pruebas automáticas
└── frontend/
    ├── index.html                   Página base (carga las fuentes)
    ├── package.json                 Dependencias y comandos (dev, build, preview)
    └── src/
        ├── main.ts                  Arranque del frontend
        ├── App.vue                  Contenedor: layout + vista activa
        ├── style.css                Estilos globales
        ├── router/index.ts          Rutas y control de acceso
        ├── layouts/                 ClimaLayout.vue (barra superior y pie)
        ├── views/                   Pantallas completas
        ├── components/              Piezas reutilizables
        ├── stores/                  Estado compartido (Pinia)
        ├── services/                Comunicación con el backend (Axios)
        └── utils/                   weatherTheme.ts
```

---

## 3. Cómo viaja una petición en el backend

Toda petición pasa por la misma cadena, definida en `index.js`, en este orden:

```
helmet → cors → express.json → cookieParser → correlationId → apiLimiter (solo /api)
   → ruta → [guardias de la ruta] → controlador → servicio → modelo → PostgreSQL
   → (si algo falla) notFoundHandler / errorHandler
```

Las capas solo dependen hacia abajo:

```
routes  →  middlewares + validators + controllers
controllers  →  services  →  models  →  config/db.js
utils (AppError, logger, token, taskQueue): los usan casi todas las capas
```

Regla práctica: la **ruta** decide qué guardias aplicar, el **controlador** habla HTTP,
el **servicio** tiene las reglas de negocio y el **modelo** es el único que escribe SQL.

---

## 4. Backend, archivo por archivo

### 4.1 Arranque — `src/index.js`

1. Carga las variables de `.env`.
2. Registra los middlewares globales (ver sección 3). CORS solo acepta el origen
   `CORS_ORIGIN` (por defecto `http://localhost:5173`) y permite cookies.
3. Monta las rutas: `/api/auth`, `/api/users`, `/api/weather`, `/api/favorites`.
4. Expone `GET /` (mensaje simple), `GET /health` (estado del servidor, de la base de datos
   y de la cola) y `/api-docs` (Swagger).
5. Al final registra `notFoundHandler` (404) y `errorHandler` (respuesta de error uniforme).
6. `start()` ejecuta primero las migraciones y solo después escucha en el puerto (3000 por defecto).

### 4.2 Configuración — `src/config/`

| Archivo | Qué hace |
|---|---|
| `db.js` | Crea el pool de conexiones a PostgreSQL con las variables `DB_*`. Añade `pool.withTransaction(fn)`: hace `BEGIN`, ejecuta `fn`, y `COMMIT` si todo va bien o `ROLLBACK` si algo falla. |
| `migrate.js` | Crea las tablas si no existen y añade las columnas que falten. Se ejecuta en cada arranque, así nunca hay que crear tablas a mano. También crea los índices únicos. |
| `seedAdmin.js` | Script (`npm run seed:admin`) que crea el usuario administrador, o asciende a admin si el correo ya existe. Credenciales por defecto: `admin@clima.com` / `Admin12345`. |
| `swagger.js` | Configuración de Swagger. Lee los comentarios `@swagger` de `src/routes/*.js` y genera `/api-docs`. |

### 4.3 Middlewares — `src/middlewares/`

| Archivo | Qué hace |
|---|---|
| `correlationId.middleware.js` | Asigna a cada petición un `x-correlation-id` (usa el que mande el cliente o crea uno) y lo devuelve en la cabecera. Al terminar la respuesta escribe un log con método, ruta, estado y duración. |
| `rateLimit.middleware.js` | `apiLimiter`: 100 peticiones por 15 minutos a `/api`. `authLimiter`: 10 por 15 minutos en login y registro. Al excederse responde 429 con código `RATE_LIMITED`. Los límites salen de `.env`. |
| `validate.middleware.js` | `validate(schema, origen)`: valida `body` o `query` con Zod. Si falla, responde 400 con el detalle por campo. Si pasa, reemplaza el dato por la versión limpia (por ejemplo, el correo en minúsculas). |
| `auth.middleware.js` | `authenticate`: exige `Authorization: Bearer <token>` válido y deja `req.user = { id, role }`. `authorize('admin')`: solo deja pasar a ciertos roles (RBAC). `authorizeSelfOrAdmin('id')`: deja pasar al dueño del recurso o a un admin (ABAC). |
| `error.middleware.js` | `notFoundHandler`: 404 para rutas inexistentes. `errorHandler`: convierte cualquier error en `{ success: false, error: { code, message }, correlationId }`. Los errores internos (500) no muestran detalles al cliente. |

### 4.4 Utilidades — `src/utils/`

| Archivo | Qué hace |
|---|---|
| `AppError.js` | Error con código HTTP. Atajos: `badRequest` (400), `unauthorized` (401), `forbidden` (403), `notFound` (404), `conflict` (409). |
| `logger.js` | Escribe logs en formato JSON (`info`, `warn`, `error`) para poder rastrearlos con el `correlationId`. |
| `token.js` | Firma y verifica los dos JWT. Access token: 15 minutos (`JWT_ACCESS_EXPIRES`). Refresh token: 7 días (`JWT_REFRESH_EXPIRES`) e incluye un `jti` para poder revocarlo. |
| `taskQueue.js` | Cola de tareas en memoria: ejecuta N tareas a la vez, ignora tareas repetidas con la misma clave y reintenta con espera creciente si una falla. La usa el servicio de clima. |

### 4.5 Validadores — `src/validators/`

| Archivo | Reglas |
|---|---|
| `auth.schema.js` | `registerSchema`: nombre de 2 a 100 caracteres, correo válido (se guarda en minúsculas), contraseña de **8 a 72** caracteres (72 es el límite de bcrypt). `loginSchema`: correo válido y contraseña no vacía. |
| `weather.schema.js` | `weatherQuerySchema`: ciudad de 2 a 100 caracteres, solo letras, espacios y `. , ' -`. `suggestQuerySchema`: igual pero desde 1 carácter. Rechazan inyecciones. |
| `favorite.schema.js` | `addFavoriteSchema`: ciudad con las mismas reglas, más latitud (-90 a 90) y longitud (-180 a 180) opcionales. |

### 4.6 Rutas — `src/routes/`

| Método y URL | Protección | Controlador |
|---|---|---|
| `POST /api/auth/register` | límite de login + validación | `auth.controller.register` |
| `POST /api/auth/login` | límite de login + validación | `auth.controller.login` |
| `POST /api/auth/refresh` | cookie con el refresh token | `auth.controller.refresh` |
| `POST /api/auth/logout` | cookie | `auth.controller.logout` |
| `GET /api/auth/me` | `authenticate` | `auth.controller.me` |
| `GET /api/users` | admin | `user.controller.getAll` |
| `GET /api/users/:id` | dueño o admin | `user.controller.getById` |
| `POST /api/users` | admin | `user.controller.create` |
| `PUT /api/users/:id` | dueño o admin | `user.controller.update` |
| `DELETE /api/users/:id` | admin | `user.controller.remove` |
| `GET /api/weather?city=` | validación | `weather.controller.getWeather` |
| `GET /api/weather/suggest?q=` | validación | `weather.controller.suggest` |
| `GET /api/favorites` | `authenticate` | `favorite.controller.list` |
| `POST /api/favorites` | `authenticate` + validación | `favorite.controller.add` |
| `DELETE /api/favorites/:id` | `authenticate` | `favorite.controller.remove` |

En `weather.routes.js`, `/suggest` está declarada antes que `/` para que Express no confunda las dos.

### 4.7 Controladores — `src/controllers/`

- **`auth.controller.js`**: llama a `AuthService` y gestiona la cookie del refresh token
  (`HttpOnly`, `SameSite=Strict`, `Secure` solo en producción, válida solo en `/api/auth`).
  El access token va en el cuerpo de la respuesta, no en la cookie.
- **`user.controller.js`**: CRUD de usuarios. Habla directamente con `user.model`.
- **`weather.controller.js`**: `getWeather` y `suggest`. Añaden la cabecera `Cache-Control`
  para que el navegador también guarde la respuesta (ver sección 10).
- **`favorite.controller.js`**: `list`, `add` y `remove`. Siempre usa `req.user.id`, por eso
  cada usuario solo ve y borra sus propias favoritas. Usa `cityKeyOf` del servicio de clima
  para calcular la clave sin acentos.

### 4.8 Servicios — `src/services/`

**`auth.service.js`**
- `register`: comprueba que el correo no exista y crea el usuario con rol `user`.
- `login`: busca el usuario, compara la contraseña con bcrypt y emite los tokens. Responde el
  mismo mensaje ("Credenciales inválidas") si falla el correo o la contraseña, para no revelar
  qué correos existen.
- `issueTokens`: crea access y refresh token y guarda el `jti` del refresh en la base.
- `refresh`: verifica el refresh token. Si ya estaba revocado, asume robo y revoca **todas** las
  sesiones del usuario. Si es válido, revoca el actual y emite uno nuevo dentro de una
  transacción (o ambas operaciones ocurren, o ninguna).
- `logout`: revoca el refresh token actual; si ya no es válido, no hace nada.
- `getProfile`: devuelve los datos del usuario autenticado.

**`weather.service.js`** — el archivo con más lógica.
- `cityKeyOf(ciudad)`: normaliza el nombre (minúsculas, sin acentos, sin espacios sobrantes).
  Así `Bogota`, `bogotá` y ` BOGOTÁ ` usan la misma entrada de caché.
- `getWeather(ciudad)` decide de dónde sale el dato:

| Situación | `source` | Qué hace |
|---|---|---|
| Está en la memoria y es reciente | `memory` | Lo devuelve al instante |
| En PostgreSQL con menos de 15 min | `cache` | Lo devuelve y lo copia a memoria |
| En PostgreSQL con 15 min a 24 h | `stale` | Lo devuelve al instante y encola una actualización en segundo plano |
| No existe, tiene más de 24 h o no tiene humedad | `api_fresh` | Consulta Open-Meteo, guarda y devuelve |
| Open-Meteo falla pero hay un dato viejo | `stale_fallback` | Devuelve el dato viejo en lugar de un error |
| Open-Meteo falla y no hay nada guardado | — | Responde 503 |

- `fetchFromApi`: dos llamadas a Open-Meteo. Primero *geocoding* (nombre → latitud y longitud)
  y luego *forecast* (coordenadas → temperatura, humedad y código del tiempo). Cada una con
  límite de 5 segundos. `getWeatherDescription` traduce el código numérico a texto en español.
- `revalidateInBackground`: mete la actualización en la cola (`taskQueue`), con 2 tareas a la vez
  como máximo y sin duplicar la misma ciudad.
- `suggestCities`: autocompletado. Pide 20 resultados al geocoding, pone primero los de
  Colombia (`orderSuggestions`) y devuelve los 6 primeros. Si falla, devuelve una lista vacía
  para no romper la pantalla.
- Los tiempos están al inicio del archivo: `FRESH_MS` (15 min) y `STALE_MS` (24 h).

### 4.9 Modelos — `src/models/`

| Archivo | Funciones |
|---|---|
| `user.model.js` | `findAll`, `findById`, `findByEmail`, `create` (hashea con bcrypt, 12 rondas), `verifyPassword`, `update` (solo nombre y correo), `delete` |
| `refreshToken.model.js` | `save`, `findByJti`, `revoke`, `revokeAllForUser`. Aceptan un cliente de transacción opcional. |
| `weatherCache.model.js` | `findByKey` (busca por clave normalizada, sin filtrar por antigüedad) y `upsertWeather` (inserta o actualiza). |
| `favorite.model.js` | `findByUser` (más recientes primero), `add` (si ya existe no duplica), `remove` (solo borra si la favorita es del usuario). |

Todas las consultas usan parámetros (`$1`, `$2`...), nunca texto concatenado: así se evita la inyección SQL.

### 4.10 Base de datos (PostgreSQL, base `backweb_db`)

| Tabla | Columnas principales |
|---|---|
| `users` | `id`, `name`, `email` (único), `password` (hash), `role` (`user` o `admin`), `created_at` |
| `refresh_tokens` | `id`, `jti` (único), `user_id` (→ users, borra en cascada), `revoked`, `expires_at`, `created_at` |
| `weather_cache` | `id`, `city_key` (único), `city`, `latitude`, `longitude`, `temperature`, `humidity`, `condition_text`, `updated_at` |
| `favorites` | `id`, `user_id` (→ users, borra en cascada), `city`, `city_key`, `latitude`, `longitude`, `created_at`. Índice único `(user_id, city_key)`. |

### 4.11 Pruebas — `backend/backweb/tests/`

Se ejecutan con `npm test` (runner nativo de Node). No necesitan base de datos ni internet.

- `taskQueue.test.js`: ejecución, de-duplicación, concurrencia y reintentos de la cola.
- `weather.logic.test.js`: normalización de ciudad y orden con Colombia primero.
- `validators.test.js`: reglas de registro, login, clima y autocompletado, incluido el rechazo de inyecciones.
- `favorite.schema.test.js`: reglas de las favoritas.

---

## 5. Flujos paso a paso

### Iniciar sesión
1. `LoginView` llama a `auth.store.login`, que usa `auth.service.ts` → `POST /api/auth/login`.
2. Backend: `authLimiter` → `validate(loginSchema)` → `auth.controller` → `AuthService.login`.
3. `user.model` busca el correo y bcrypt compara la contraseña.
4. Se crean los dos tokens y se guarda el `jti` del refresh en `refresh_tokens`.
5. El controlador pone el refresh en una cookie `HttpOnly` y devuelve el access token en el cuerpo.
6. El frontend guarda el access token **solo en memoria** (en el store, no en `localStorage`).

### Renovar la sesión
1. El access token dura 15 minutos. Al vencer, el backend responde 401.
2. El interceptor de `http.ts` llama a `POST /api/auth/refresh` (el navegador envía la cookie sola).
3. El backend revoca el refresh usado y emite uno nuevo en una transacción.
4. La petición original se repite con el token nuevo. Si hay varias peticiones a la vez,
   comparten **un solo** intento de renovación.

### Buscar el clima
1. `CajaBusqueda` emite la ciudad → `BuscadorView.handleSearch` → `weather.store.searchCityWeather`.
2. `weather.service.ts` hace `GET /api/weather?city=...`.
3. Backend: `validate` → `weather.controller` → `WeatherService.getWeather` (memoria → PostgreSQL → Open-Meteo).
4. La respuesta `{ source, data }` vuelve al store; si hay datos, el router abre `/result`.
5. `ResultadoClimaView` elige el ícono y el fondo según `condition_text` y muestra la insignia de origen.

### Autocompletado
1. `CajaBusqueda` espera 300 ms sin escribir y, con 3 letras o más, pide `GET /api/weather/suggest?q=...`.
2. El backend consulta el geocoding de Open-Meteo, pone primero las ciudades de Colombia y devuelve 6.
3. Se muestra el desplegable. Flechas arriba y abajo para moverse, Enter para elegir, Escape para cerrar.

### Favoritas
1. En el resultado, la estrella llama a `favorite.store.add` → `POST /api/favorites`.
2. Backend: `authenticate` → `validate` → controlador → `INSERT ... ON CONFLICT` (no duplica).
3. `BuscadorView` carga `GET /api/favorites` al abrirse y muestra las favoritas como botones.
4. Al cerrar sesión, `auth.store.clearSession` vacía las favoritas del usuario saliente.

---

## 6. Frontend, archivo por archivo

### 6.1 Arranque — `src/main.ts`

1. Crea la aplicación Vue y registra Pinia (estado) y el router.
2. Conecta Axios con el store de autenticación (`configureHttpAuth`): cómo leer el token, cómo
   renovarlo y qué hacer al cerrar sesión. Se hace así para evitar una dependencia circular.
3. Intenta recuperar la sesión con la cookie de refresh (`restoreSession`) y **después** monta la app.

### 6.2 Rutas — `src/router/index.ts`

| Ruta | Vista | Condición |
|---|---|---|
| `/login`, `/register` | LoginView, RegistroView | Solo invitados: si ya hay sesión, redirige al inicio |
| `/` | BuscadorView | Requiere sesión |
| `/result` | ResultadoClimaView | Requiere sesión **y** que exista un clima cargado en el store |
| cualquier otra | PaginaNoEncontradaView | 404 |

Un guardia global asíncrono (`beforeEach`) intenta recuperar la sesión antes de decidir. Si no hay
sesión y la ruta la exige, manda a `/login` guardando la ruta de origen.

### 6.3 Estado — `src/stores/` (Pinia)

| Store | Guarda | Acciones |
|---|---|---|
| `auth.store.ts` | `accessToken` (solo en memoria), `user`, `loading`, `error`. Getters: `isAuthenticated`, `role` | `login`, `register`, `refresh`, `logout`, `restoreSession`, `setSession`, `clearSession` |
| `weather.store.ts` | `currentWeather`, `loading`, `error`, `sourceInfo` | `searchCityWeather`, `clearState`, `extractError` |
| `favorite.store.ts` | `items`, `loading`. Getter: `isFavorite(ciudad)` | `load`, `add`, `remove`, `clear` |

### 6.4 Servicios — `src/services/`

- **`http.ts`**: instancia de Axios apuntando a `http://localhost:3000`, con cookies y límite de 10 s.
  - *Petición*: añade `Authorization: Bearer <token>` si hay sesión.
  - *Respuesta*: reintenta hasta 3 veces (esperas de 300, 600 y 1200 ms) ante error de red, 5xx o 429,
    solo en GET, HEAD y OPTIONS. Si el servidor manda `Retry-After`, lo respeta.
  - *401*: renueva el token una sola vez y repite la petición; si falla, cierra la sesión.
- **`auth.service.ts`**: `register`, `login`, `refresh`, `logout`, `me` y `extractError` (convierte el error del backend en un texto legible).
- **`weather.service.ts`**: `fetchWeather` y `suggestCities`. Define los tipos `WeatherData`, `WeatherSource` y `CitySuggestion`.
- **`favorite.service.ts`**: `list`, `add`, `remove`.

### 6.5 Utilidades — `src/utils/weatherTheme.ts`

`kindFromCondition(texto)` convierte la condición en español en un tipo: `storm`, `snow`, `rain`, `fog`,
`cloudy` o `sunny`. `themeFromCondition` añade el degradado de fondo de cada tipo.

### 6.6 Componentes — `src/components/`

| Componente | Qué hace |
|---|---|
| `CajaBusqueda.vue` | Campo de búsqueda con autocompletado. Constante `MIN_CHARS = 3`, espera de 300 ms, ignora respuestas viejas que llegan tarde y se maneja con teclado. |
| `FilaCoordenadas.vue` | Casillas de latitud, longitud y humedad (la humedad solo se muestra si existe). |
| `InsigniaOrigen.vue` | Aviso del origen del dato. Agrupa los 5 valores de `source` en 3 estados: caché (`memory`, `cache`), API fresca (`api_fresh`) y caché antigua (`stale`, `stale_fallback`). |
| `WeatherIcon.vue` | Ícono SVG animado según el tipo de clima. Respeta la preferencia del sistema de reducir movimiento. |

### 6.7 Layout y vistas

| Archivo | Qué hace |
|---|---|
| `App.vue` | Envuelve la vista activa (`RouterView`) dentro de `ClimaLayout`. |
| `layouts/ClimaLayout.vue` | Barra superior (marca, Inicio, nombre del usuario y botón Salir) y pie de página. |
| `views/LoginView.vue` | Formulario de inicio de sesión. Tras entrar, redirige a la ruta que el usuario intentaba abrir. |
| `views/RegistroView.vue` | Formulario de registro (`minlength="8"` en la contraseña). Tras crear la cuenta, lleva al login. |
| `views/BuscadorView.vue` | Pantalla principal: buscador, errores y lista de favoritas. |
| `views/ResultadoClimaView.vue` | Tarjeta del clima con ícono, temperatura, condición, coordenadas, humedad, insignia y estrella de favorita. |
| `views/PaginaNoEncontradaView.vue` | Pantalla 404. |

---

## 7. Cómo se conectan frontend y backend

- **Dirección:** el frontend llama a `http://localhost:3000`. El backend solo acepta el origen
  `http://localhost:5173` y permite cookies.
- **Formato de respuesta:** el backend responde `{ success, data }` y, en errores,
  `{ success: false, error: { code, message }, correlationId }`.
- **Token:** el access token viaja en la cabecera `Authorization`; el refresh token, en una cookie
  que JavaScript no puede leer.
- **Tipos:** `WeatherData` en `weather.service.ts` debe coincidir con lo que devuelve `weather.service.js`.
  Si agregas un campo en un lado y no en el otro, simplemente no aparece.

Para agregar un dato nuevo (por ejemplo, viento), el orden recomendado es:
Open-Meteo en `fetchFromApi` → columna en `migrate.js` → modelo → servicio → tipo en el frontend → vista.

---

## 8. Dónde cambiar qué

| Si quieres cambiar... | Archivo | Qué tocar |
|---|---|---|
| Contraseña mínima | `backend/backweb/src/validators/auth.schema.js` y `frontend/src/views/RegistroView.vue` | `.min(8, ...)` con su mensaje, y `minlength="8"` con el texto "Mínimo 8" |
| Tiempo en que el dato es fresco | `backend/backweb/src/services/weather.service.js` | `FRESH_MS` |
| Cuántas sugerencias se devuelven | mismo archivo, función `suggestCities` | `.slice(0, 6)` |
| Desde cuántas letras sugiere | `frontend/src/components/CajaBusqueda.vue` | `MIN_CHARS` |
| País que aparece primero | `weather.service.js`, función `orderSuggestions` | `'CO'` y `'Colombia'` |
| Límite de intentos de login | `backend/backweb/.env` | `AUTH_RATE_LIMIT_MAX` (reiniciar con `rs`) |
| Duración de las sesiones | `backend/backweb/.env` | `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES` |
| Reintentos de Axios | `frontend/src/services/http.ts` | `MAX_RETRIES`, `RETRY_BASE_DELAY_MS` |
| Colores de cada clima | `frontend/src/utils/weatherTheme.ts` | los degradados de `THEMES` |
| Unidad de temperatura | `weather.service.js` (`fetchFromApi`) y `ResultadoClimaView.vue` | parámetro `temperature_unit` de la URL y el texto `°C` |
| Orden de las favoritas | `backend/backweb/src/models/favorite.model.js` | `ORDER BY created_at DESC` |
| Quién puede usar una ruta | `backend/backweb/src/routes/*.routes.js` | agregar `authorize('admin')` |
| Textos de la interfaz | `frontend/src/views/` y `frontend/src/layouts/` | el texto de la plantilla |

Los archivos `.js` del backend se recargan solos al guardar (nodemon). El `.env` no: hay que
escribir `rs` en la terminal del backend. El frontend se recarga solo (Vite).

---

## 9. Comandos

| Dónde | Comando | Para qué |
|---|---|---|
| `backend/backweb` | `npm install` | Instalar dependencias (una vez) |
| `backend/backweb` | `npm run dev` | Backend con recarga automática |
| `backend/backweb` | `npm test` | Ejecutar las pruebas |
| `backend/backweb` | `npm run seed:admin` | Crear el usuario administrador |
| `frontend` | `npm install` | Instalar dependencias (una vez) |
| `frontend` | `npm run dev` | Frontend en `http://localhost:5173` |
| `frontend` | `npm run build` | Compilar y revisar los tipos de TypeScript |

Requisitos: Node.js, PostgreSQL con la base `backweb_db` creada y un archivo `backend/backweb/.env`
copiado de `.env.example`.

---

## 10. Limitaciones conocidas

Son detalles reales del código actual. Conviene conocerlos antes de explicar el proyecto.

1. **El navegador también guarda las respuestas del clima.** `weather.controller.js` envía
   `Cache-Control: public, max-age=1800` (30 minutos) en el clima y `max-age=300` (5 minutos) en
   el autocompletado. Aunque el servidor considere fresco un dato solo 15 minutos, el navegador
   puede reutilizar una respuesta sin llamar al backend. Al probar cambios de caché, usa Swagger,
   `curl`, o recarga sin caché (`Ctrl+Shift+R`).
2. **El clima y el autocompletado no usan la instancia `http`.** `weather.service.ts` llama a `axios`
   directamente, por lo que esas dos peticiones no tienen los reintentos automáticos ni el renovado
   de token. Auth y favoritas sí pasan por `http.ts`.
3. **Usuarios y favoritas no tienen servicio.** `user.controller.js` y `favorite.controller.js` llaman
   directo al modelo, porque solo hacen operaciones simples sobre la base de datos.
4. **Secretos por defecto.** Si falta el `.env`, `token.js` usa secretos de desarrollo
   (`dev_access_secret`, `dev_refresh_secret`). En un entorno real deben definirse siempre en `.env`.
5. **Códigos del tiempo sin traducir.** `getWeatherDescription` conoce 19 códigos de Open-Meteo.
   Los demás (por ejemplo, tormenta con granizo) se muestran como "Condiciones cambiantes".
6. **La caché en memoria se pierde al reiniciar el servidor.** La de PostgreSQL no.
7. **El clima viene de un modelo meteorológico**, no de una estación en la ciudad. Puede diferir
   unos grados de otros proveedores.
8. **El estado de la vista de resultado vive en memoria.** Si recargas `/result`, el guardia del
   router te devuelve al inicio.

---

## 11. Glosario

| Término | Significado |
|---|---|
| **JWT** | Token firmado que identifica al usuario sin consultar la base en cada petición. |
| **Access token** | JWT de vida corta (15 min) que viaja en la cabecera `Authorization`. |
| **Refresh token** | JWT de vida larga (7 días) en una cookie `HttpOnly`; sirve para pedir un access token nuevo. |
| **Token rotativo** | Cada vez que se usa el refresh token, se invalida y se entrega uno nuevo. |
| **RBAC** | Control de acceso por rol (`user`, `admin`). |
| **ABAC / ownership** | Control de acceso por propiedad: solo el dueño del recurso (o un admin) puede usarlo. |
| **Middleware** | Función que se ejecuta antes del controlador y puede dejar pasar o rechazar la petición. |
| **Stale-While-Revalidate** | Servir un dato antiguo al instante y actualizarlo en segundo plano. |
| **L1 / L2** | Caché en memoria (rápida) y caché en PostgreSQL (persistente). |
| **Transacción ACID** | Grupo de operaciones que se aplican todas o ninguna. |
| **Debounce** | Esperar a que el usuario deje de escribir antes de hacer una petición. |
| **Store (Pinia)** | Estado compartido entre las pantallas del frontend. |
| **Interceptor** | Código de Axios que se ejecuta en cada petición o respuesta. |
