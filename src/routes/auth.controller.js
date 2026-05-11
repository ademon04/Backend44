'use strict';

const authService = require('../services/auth.service');

// ── LOGIN ────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const resultado = await authService.login(email, password);

    if (resultado.error) {
      return res.status(401).json({ ok: false, error: resultado.error });
    }

    res.json({ ok: true, data: { token: resultado.token, usuario: resultado.usuario } });
  } catch (err) {
    next(err);
  }
};

// ── REGISTRAR ────────────────────────────────────────────────────────────────
const registrarUsuario = async (req, res, next) => {
  try {
    const resultado = await authService.registrar(req.body); // ← nombre alineado

    if (resultado.error) {
      return res.status(409).json({ ok: false, error: resultado.error });
    }

    res.status(201).json({ ok: true, data: resultado.usuario });
  } catch (err) {
    next(err);
  }
};

// ── LISTAR ───────────────────────────────────────────────────────────────────
const listarUsuarios = async (req, res, next) => {
  try {
    const usuarios = await authService.listarUsuarios();
    res.json({ ok: true, data: usuarios });
  } catch (err) {
    next(err);
  }
};

// ── REFRESCAR TOKEN ──────────────────────────────────────────────────────────
const refrescarToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const resultado = await authService.refrescarToken(token);
    res.json({ ok: true, data: { token: resultado.token } });
  } catch (err) {
    next(err); // jwt.verify lanza → errorHandler lo atrapa
  }
};

// ── ME ───────────────────────────────────────────────────────────────────────
const authMe = async (req, res, next) => {
  try {
    const usuario = await authService.obtenerUsuarioPorId(req.usuario.id); // ← nombre alineado

    if (!usuario) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }

    res.json({ ok: true, data: usuario });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, registrarUsuario, listarUsuarios, refrescarToken, authMe };