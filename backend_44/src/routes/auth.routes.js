//auth routes
'use strict';

const express = require('express');
const router = express.Router();

const { verificarToken, verificarRol } = require('../middleware/auth');
const { validateLogin, validateRegistro, validateRefreshToken } = require('./auth.validator');
const { login, registrarUsuario, listarUsuarios, refrescarToken, authMe } = require('./auth.controller');

// POST /api/auth/login — público
router.post('/login', validateLogin, login);

// POST /api/auth/registro — solo admin
router.post('/registro', verificarToken, verificarRol(['admin']), validateRegistro, registrarUsuario);

// GET /api/auth/usuarios — solo admin
router.get('/usuarios', verificarToken, verificarRol(['admin']), listarUsuarios);

// POST /api/auth/refrescar — token activo requerido
router.post('/refrescar', verificarToken, validateRefreshToken, refrescarToken);

// GET /api/auth/me — usuario actual
router.get('/me', verificarToken, authMe);

module.exports = router;