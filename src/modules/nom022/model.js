'use strict';

const mongoose = require('mongoose');
const empresaSchema = require('../../models/empresa.model');
const { getConnection } = require('../../connections/pool');

const connection = getConnection('nom022');

// ============================================================================
// TERRÓMETRO
// ============================================================================
const terrometroSchema = new mongoose.Schema({
  marca:             { type: String, required: true },
  modelo:            { type: String, required: true },
  serie_id:          { type: String, required: true, unique: true },
  fecha_calibracion: { type: Date,   required: true },
  fecha_vencimiento: { type: Date,   required: true },
  certificado:       { type: String },
  activo:            { type: Boolean, default: true }
}, { timestamps: true });

// ============================================================================
// MULTÍMETRO
// ============================================================================
const multimetroSchema = new mongoose.Schema({
  marca:             { type: String, required: true },
  modelo:            { type: String, required: true },
  serie_id:          { type: String, required: true, unique: true },
  fecha_calibracion: { type: Date,   required: true },
  fecha_vencimiento: { type: Date,   required: true },
  certificado:       { type: String },
  activo:            { type: Boolean, default: true }
}, { timestamps: true });

// ============================================================================
// LECTURAS POR DISTANCIA (método caída de tensión)
// Distancias: 1m, 4m, 7m, 10m, 13m, 16m, 19m
// ============================================================================
const lecturaDistanciaSchema = new mongoose.Schema({
  distancia_m: { type: Number, required: true }, // 1, 4, 7, 10, 13, 16, 19
  valor_ohm:   { type: Number, required: true }
}, { _id: false });

// ============================================================================
// POZO DE TIERRA (punto de medición)
// ============================================================================
const pozoSchema = new mongoose.Schema({
  numero:          { type: Number, required: true },
  area:            { type: String },
  ubicacion:       { type: String },
  puente_union:    { type: String },
  lugar:           { type: String, enum: ['Abierto', 'Cerrado'] },
  estado_fisico:   { type: String },
  sistema:         { type: String, enum: ['Pararrayos', 'Electrodo'] },
  tipo_pararrayos: { type: String },
  altura_m:        { type: Number },

  // Condiciones ambientales
  temperatura_c:    { type: Number },
  humedad_relativa: { type: Number },

  // Lecturas del método caída de tensión
  lecturas: [lecturaDistanciaSchema],

  // Resultados calculados
  resultado_ohm:    { type: Number },
  limite_ohm:       { type: Number },
  ue_ohm:           { type: Number },
  cumple:           { type: Boolean },
  area_cobertura:   { type: Number },
}, { _id: true });

// ============================================================================
// CONTINUIDAD (puente de unión)
// ============================================================================
const continuidadSchema = new mongoose.Schema({
  identificacion:  { type: String, required: true },
  ubicacion:       { type: String },
  puente_union:    { type: String },
  continuidad_ohm: { type: Number },
  tiene_continuidad: { type: Boolean },
  pozo_numero:     { type: Number }, // referencia al pozo al que pertenece
}, { _id: true });

// ============================================================================
// VERIFICACIÓN DEL EQUIPO
// ============================================================================
const verificacionEquipoSchema = new mongoose.Schema({
  fecha:            { type: Date, default: Date.now },
  verificado_por:   { type: String },
  resistencia_1ohm_inicial:  { type: Number },
  resistencia_10ohm_inicial: { type: Number },
  resistencia_22ohm_inicial: { type: Number },
  resistencia_30ohm_inicial: { type: Number },
  resistencia_1ohm_final:    { type: Number },
  resistencia_10ohm_final:   { type: Number },
  resistencia_22ohm_final:   { type: Number },
  resistencia_30ohm_final:   { type: Number },
  cumple_criterio:  { type: Boolean }
}, { _id: false });

// ============================================================================
// ESTUDIO PRINCIPAL
// ============================================================================
const estudioSchema = new mongoose.Schema({

  numero_informe: { type: String, required: true, unique: true, trim: true },
  orden_servicio: { type: String, required: true, trim: true },

  estado: {
    type: String,
    enum: ['reconocimiento', 'medicion', 'calculado', 'informe', 'validado'],
    default: 'reconocimiento'
  },

  historial_estados: [{
    estado:      String,
    fecha:       { type: Date, default: Date.now },
    usuario:     String,
    observacion: String
  }],

  fecha_reconocimiento: Date,
  fecha_medicion:       Date,
  fecha_informe:        Date,
  fecha_recepcion:      Date,
  fecha_emision:        Date,

  empresa:             empresaSchema,
  terrometro:          { type: mongoose.Schema.Types.ObjectId, ref: 'Terrometro' },
  multimetro:          { type: mongoose.Schema.Types.ObjectId, ref: 'Multimetro' },
  verificacion_equipo: verificacionEquipoSchema,

  condiciones_generales: {
    condiciones_operacion: { type: String },
    observaciones:         { type: String }
  },

  pozos:        [pozoSchema],
  continuidades: [continuidadSchema],

  resultados: {
    total_pozos:          { type: Number, default: 0 },
    total_pozos_cumplen:  { type: Number, default: 0 },
    total_continuidades:  { type: Number, default: 0 },
    conclusion_general:   { type: String },
    pozos_fallidos:       [{ type: Number }],
    regla_decision: {
      type: String,
      default: 'Se emplea una "Regla de Decisión de Aceptación Simple" como lo establece el documento "Guidelines on Decision Rules of Conformity" ILAC-G8:09/2019. La incertidumbre estimada UE, se expresa con un factor de cobertura k=2 que corresponde aproximadamente a un nivel de confianza del 95%. Se calcula basándose en la guía para la expresión de incertidumbre en los resultados de las mediciones (NMX-CH-140-IMNC-2002).'
    }
  },

  responsable_estudio: { type: String },
  verificador:         { type: String },
  supervisor:          { type: String },
  ingeniero_servicio:  { type: String },
  observaciones:       { type: String, default: 'Ninguna.' },
  metodo:              { type: String, default: 'NOM-022-STPS-2015' }

}, {
  timestamps: {
    createdAt: 'creado_en',
    updatedAt: 'actualizado_en'
  }
});

estudioSchema.index({ 'resultados.pozos_fallidos': 1 });
estudioSchema.index({ 'pozos.cumple': 1 });
estudioSchema.index({ fecha_medicion: -1 });
estudioSchema.index({ estado: 1, fecha_medicion: -1 });

terrometroSchema.index({ activo: 1 });
terrometroSchema.index({ fecha_vencimiento: 1 });
multimetroSchema.index({ activo: 1 });
multimetroSchema.index({ fecha_vencimiento: 1 });

const Terrometro  = connection.models.Terrometro  || connection.model('Terrometro',  terrometroSchema);
const Multimetro  = connection.models.Multimetro  || connection.model('Multimetro',  multimetroSchema);
const Estudio022  = connection.models.Estudio022  || connection.model('Estudio022',  estudioSchema);

module.exports = { Terrometro, Multimetro, Estudio022 };