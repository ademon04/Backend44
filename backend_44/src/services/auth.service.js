'use strict';

const jwt = require('jsonwebtoken');
const { Usuario } = require('../models/usuario.model');

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ── LOGIN ────────────────────────────────────────────────────────────────────
async function login(email, password) {
  const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() });

  if (!usuario)        return { error: 'Credenciales inválidas' };
  if (!usuario.activo) return { error: 'Usuario inactivo, contacta al administrador' };

  const passwordOk = await usuario.compararPassword(password);
  if (!passwordOk) return { error: 'Credenciales inválidas' };

  usuario.ultimo_acceso = new Date();
  await usuario.save();

  const token = _generarToken(usuario);
  return { token, usuario: usuario.toJSON() };
}

// ── REGISTRAR ────────────────────────────────────────────────────────────────
async function registrar(datos) {                          // ← nombre limpio, un solo arg
  const { nombre, email, password, rol, firma } = datos;

  const existe = await Usuario.findOne({ email: email.toLowerCase().trim() });
  if (existe) return { error: 'Ya existe un usuario con ese email' };

  const usuario = new Usuario({
    nombre,
    email,
    password_hash: password,
    rol,
    firma: firma || undefined,
    activo: true,
  });

  await usuario.save();
  return { usuario: usuario.toJSON() };
}

// ── LISTAR ───────────────────────────────────────────────────────────────────
async function listarUsuarios() {
  return Usuario.find().select('-password_hash').sort({ creado_en: -1 });
}

// ── OBTENER POR ID ───────────────────────────────────────────────────────────
async function obtenerUsuarioPorId(id) {                   // ← nombre alineado con controller
  return Usuario.findById(id).select('-password_hash');
}

// ── REFRESCAR TOKEN ──────────────────────────────────────────────────────────
async function refrescarToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
  // Si jwt.verify falla lanza excepción → el catch del controller la atrapa

  const usuario = await Usuario.findById(decoded.id);
  if (!usuario || !usuario.activo) {
    const err = new Error('Usuario no válido');
    err.status = 401;
    throw err;                                             // ← consistente: siempre throw
  }

  return { token: _generarToken(usuario) };
}

// ── HELPER PRIVADO ───────────────────────────────────────────────────────────
function _generarToken(usuario) {
  return jwt.sign(
    { id: usuario._id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

module.exports = { login, registrar, listarUsuarios, obtenerUsuarioPorId, refrescarToken };