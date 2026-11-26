// backend/backweb/src/middlewares/auth.middleware.js
// ─────────────────────────────────────────────────────────
// Qué hace: Exporta tres guardias. authenticate verifica el Bearer token y deja req.user.
//           authorize(...roles) implementa RBAC: solo permite ciertos roles (ej: admin).
//           authorizeSelfOrAdmin implementa ABAC: dueño del recurso o admin.
// Conectado con: AppError.js, token.js, auth.routes.js, user.routes.js, favorite.routes.js.
// Rol: Capa de seguridad de acceso. Es el guardián de todas las rutas protegidas del proyecto.
const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/token');

/**
 * authenticate: exige un Access Token válido en Authorization: Bearer <token>.
 * Deja el payload decodificado en req.user = { id, role }.
 * Se usa como middleware en cada ruta que requiere sesión activa.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized('Token de acceso ausente o malformado'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (_err) {
    return next(AppError.unauthorized('Token de acceso inválido o expirado'));
  }
}

/**
 * authorize(...roles): RBAC. Permite el paso solo si el rol del usuario
 * está dentro de la lista permitida para el endpoint.
 * Uso: router.get('/admin', authenticate, authorize('admin'), handler)
 *
 * @param {...string} roles  Roles permitidos (ej: 'admin')
 * @returns {import('express').RequestHandler}
 */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(AppError.forbidden('No tienes permisos para este recurso'));
    }
    next();
  };
}

/**
 * authorizeSelfOrAdmin: ABAC / resource ownership.
 * Permite el acceso si el usuario es admin O si el :id del recurso coincide
 * con el id del usuario autenticado (es "dueño" del recurso).
 * Esto permite que GET /api/users/:id sea accesible tanto por el propio usuario
 * como por un admin, sin exponer todos los recursos a todos los usuarios.
 *
 * @param {string} [paramName='id']  Nombre del parámetro de ruta con el id del recurso
 * @returns {import('express').RequestHandler}
 */
function authorizeSelfOrAdmin(paramName = 'id') {
  return (req, _res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    const resourceId = Number(req.params[paramName]);
    const isOwner = req.user.id === resourceId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return next(AppError.forbidden('Solo puedes acceder a tus propios recursos'));
    }
    next();
  };
}

module.exports = { authenticate, authorize, authorizeSelfOrAdmin };
