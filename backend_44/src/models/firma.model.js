// src/models/firma.model.js
'use strict';

const mongoose = require('mongoose');

// Reutilizar en estudioSchema de cada NOM
const firmaEstudioSchema = new mongoose.Schema({
  usuario_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  nombre:     { type: String },
  rol:        { type: String },
  fecha:      { type: Date, default: Date.now },
  firma_url:  { type: String },
  cedula:     { type: String },
  cargo:      { type: String },
}, { _id: false });

module.exports = firmaEstudioSchema;