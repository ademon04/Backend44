// src/models/usuario.model.js
'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ============================================================================
// FIRMA DIGITAL
// ============================================================================
const firmaSchema = new mongoose.Schema({
  firma_url:  { type: String }, 
  cedula:     { type: String }, 
  cargo:      { type: String },  
  institucion:{ type: String },  
}, { _id: false });

// ============================================================================
// USUARIO
// ============================================================================
const usuarioSchema = new mongoose.Schema({
  email: {
    type:      String,
    required:  true,
    unique:    true,
    trim:      true,
    lowercase: true,
    match:     [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  password_hash: {
    type:     String,
    required: true
  },
  nombre: {
    type:     String,
    required: true,
    trim:     true
  },
  rol: {
    type: String,
    enum: ['admin', 'laboratorio', 'supervisor', 'signatario', 'consulta'],
    default: 'consulta'
  },
  firma:   firmaSchema,
  activo:  { type: Boolean, default: true },
  ultimo_acceso: Date,
}, {
  timestamps: {
    createdAt: 'creado_en',
    updatedAt: 'actualizado_en'
  }
});

// ============================================================================
// ÍNDICES
// ============================================================================
usuarioSchema.index({ rol:    1 });
usuarioSchema.index({ activo: 1 });

// ============================================================================
// ENCRIPTAR PASSWORD ANTES DE GUARDAR
// ============================================================================
usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('password_hash')) return next();
  try {
    const salt        = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// MÉTODO PARA COMPARAR PASSWORD
// ============================================================================
usuarioSchema.methods.compararPassword = async function(password) {
  return bcrypt.compare(password, this.password_hash);
};

// ============================================================================
// OCULTAR CAMPOS SENSIBLES EN JSON
// ============================================================================
usuarioSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password_hash;
    delete ret.__v;
    return ret;
  }
});

// ============================================================================
// HELPER — Permisos por rol
// ============================================================================
const PERMISOS = {
  admin:       ['crear', 'leer', 'actualizar', 'eliminar', 'firmar', 'autorizar'],
  laboratorio: ['crear', 'leer', 'actualizar'],
  supervisor:  ['leer', 'firmar', 'autorizar'],
  signatario:  ['crear', 'leer', 'actualizar', 'eliminar', 'firmar', 'autorizar'],
  consulta:    ['leer'],
};

usuarioSchema.methods.tienePerm = function(permiso) {
  return PERMISOS[this.rol]?.includes(permiso) ?? false;
};

module.exports = {
  Usuario: mongoose.model('Usuario', usuarioSchema),
  PERMISOS,
};