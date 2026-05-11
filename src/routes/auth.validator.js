//auth validator
'use strict';

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      error: 'Email y password requeridos'
    });
  }

  // Validación básica de formato email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      ok: false,
      error: 'Formato de email inválido'
    });
  }

  next();
};

const validateRegistro = (req, res, next) => {
  const { email, password, nombre } = req.body;

  if (!email || !password || !nombre) {
    return res.status(400).json({
      ok: false,
      error: 'Nombre, email y password son requeridos'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      ok: false,
      error: 'Formato de email inválido'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      ok: false,
      error: 'El password debe tener al menos 8 caracteres'
    });
  }

  next();
};

const validateRefreshToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(400).json({
      ok: false,
      error: 'Token requerido'
    });
  }

  next();
};

module.exports = { validateLogin, validateRegistro, validateRefreshToken };