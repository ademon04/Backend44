'use strict';

const logger = require('../config/logger');

// ============================================================================
// 404 — Ruta no encontrada
// Debe ir ANTES del errorHandler pero DESPUÉS de todas las rutas.
// ============================================================================

function notFound(req, res, next) {
  const err  = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

// ============================================================================
// ERROR HANDLER GLOBAL
// Debe ser el ÚLTIMO middleware registrado en App.js.
// ============================================================================

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.status || err.statusCode || 500;

  // ── Errores de Mongoose ───────────────────────────────────────────────────

  if (err.name === 'ValidationError') {
    const campos = Object.keys(err.errors).map(k => ({
      campo:   k,
      mensaje: err.errors[k].message,
    }));
    logger.warn(`ValidationError ${req.method} ${req.path} — ${err.message}`);
    return res.status(400).json({ ok: false, error: 'Error de validación', campos });
  }

  if (err.code === 11000) {
    const campo = Object.keys(err.keyPattern || {})[0] ?? 'campo';
    logger.warn(`DuplicateKey ${req.method} ${req.path} — campo: ${campo}`);
    return res.status(409).json({
      ok:    false,
      error: 'Registro duplicado',
      campo,
      valor: err.keyValue?.[campo],
    });
  }

  if (err.name === 'CastError') {
    logger.warn(`CastError ${req.method} ${req.path} — ${err.path}: ${err.value}`);
    return res.status(400).json({
      ok:    false,
      error: 'ID o valor con formato inválido',
      campo: err.path,
      valor: err.value,
    });
  }

  // ── Errores de JWT ────────────────────────────────────────────────────────

  if (err.name === 'JsonWebTokenError') {
    logger.warn(`JWT inválido ${req.method} ${req.path}`);
    return res.status(401).json({ ok: false, error: 'Token inválido' });
  }

  if (err.name === 'TokenExpiredError') {
    logger.warn(`JWT expirado ${req.method} ${req.path}`);
    return res.status(401).json({ ok: false, error: 'Token expirado' });
  }

  // ── Errores de MongoDB ────────────────────────────────────────────────────

  if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError') {
    logger.error(`MongoDB no disponible ${req.method} ${req.path} — ${err.message}`);
    return res.status(503).json({ ok: false, error: 'Base de datos no disponible, intenta más tarde' });
  }

  // ── Error genérico ────────────────────────────────────────────────────────

  logger.error(`${status} ${req.method} ${req.path} — ${err.message}`, { stack: err.stack });

  const respuesta = {
    ok:     false,
    error:  err.message || 'Error interno del servidor',
    status,
  };

  if (process.env.NODE_ENV === 'development') {
    respuesta.stack = err.stack;
  }

  res.status(status).json(respuesta);
}

module.exports = { errorHandler, notFound };