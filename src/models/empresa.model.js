// src/models/empresa.model.js
'use strict';

const mongoose = require('mongoose');

const empresaSchema = new mongoose.Schema({
  razon_social: { type: String, trim: true },
  calle_numero: { type: String, trim: true },
  colonia: { type: String, trim: true },
  municipio: { type: String, trim: true },
  estado: { type: String, trim: true },
  codigo_postal: { type: String, trim: true },
  zona: { type: String, trim: true },
  altitud_msnm: { type: Number },
  responsable: { type: String, trim: true },
  cargo: { type: String, trim: true },
  telefono: { type: String, trim: true }
}, { _id: false });

module.exports = empresaSchema;