const jwt = require('jsonwebtoken');

/**
 * Verifica el JWT enviado en el header Authorization: Bearer <token>.
 * Si es válido, adjunta el payload decodificado en req.user.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, rol, ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * RBAC: restringe el acceso a uno o varios roles.
 * Roles del sistema (según el plan de trabajo): cliente, mesero, cajero, admin.
 * Uso: requireRole('admin') o requireRole('admin', 'cajero')
 */
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
