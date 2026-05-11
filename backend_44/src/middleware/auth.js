'use strict';

const jwt = require('jsonwebtoken');

// ============================================================================
// VERIFICAR TOKEN — obligatorio
// ============================================================================
function verificarToken(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      ok:    false,
      error: 'No se proporcionó token de autenticación'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = {
      id:     decoded.id,
      email:  decoded.email,
      rol:    decoded.rol,
      nombre: decoded.nombre
    };
    next();
  } catch (err) {
    next(err); // JsonWebTokenError y TokenExpiredError los atrapa el errorHandler
  }
}

// ============================================================================
// VERIFICAR TOKEN — opcional
// Para rutas que funcionan con o sin autenticación
// ============================================================================
function verificarTokenOpcional(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = {
        id:     decoded.id,
        email:  decoded.email,
        rol:    decoded.rol,
        nombre: decoded.nombre
      };
    } catch {
      req.usuario = null;
    }
  } else {
    req.usuario = null;
  }

  next();
}

// ============================================================================
// VERIFICAR ROL
// Uso: verificarToken, verificarRol(['admin', 'supervisor'])
// ============================================================================
function verificarRol(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ ok: false, error: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        ok:    false,
        error: `Se requiere uno de estos roles: ${rolesPermitidos.join(', ')}`
      });
    }

    next();
  };
}

module.exports = { verificarToken, verificarTokenOpcional, verificarRol };