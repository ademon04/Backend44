'use strict';

const mongoose    = require('mongoose');
const empresaSchema = require('../../models/empresa.model');
const { getConnection } = require('../../connections/pool');

const connection = getConnection('nom011');

// ============================================================================
// SONÓMETRO INTEGRADOR NOM-011
// ============================================================================
const sonometroIntegradorSchema = new mongoose.Schema({
  marca:             { type: String, required: true },
  modelo:            { type: String, required: true },
  serie_id:          { type: String, required: true, unique: true },
  fecha_calibracion: { type: Date,   required: true },
  fecha_vencimiento: { type: Date,   required: true },
  certificado:       { type: String },
  incertidumbre_db:  { type: Number },
  incertidumbre_pct: { type: Number },
  factor_cobertura:  { type: Number, default: 2 },
  activo:            { type: Boolean, default: true },
  observaciones:     { type: String },
}, { timestamps: true });

// ============================================================================
// DOSÍMETRO NOM-011
// ============================================================================
const dosimetroSchema = new mongoose.Schema({
  marca:             { type: String, required: true },
  modelo:            { type: String, required: true },
  serie_id:          { type: String, required: true, unique: true },
  fecha_calibracion: { type: Date,   required: true },
  fecha_vencimiento: { type: Date,   required: true },
  certificado:       { type: String },
  activo:            { type: Boolean, default: true },
  observaciones:     { type: String },
}, { timestamps: true });

// ============================================================================
// TABLA LMPE (NOM-011 Apéndice A, Tabla 1)
// NER dB(A) → TMPE horas
// ============================================================================
const TABLA_LMPE = [
  { ner: 90,  tmpe: 8    },
  { ner: 93,  tmpe: 4    },
  { ner: 96,  tmpe: 2    },
  { ner: 99,  tmpe: 1    },
  { ner: 102, tmpe: 0.5  },
  { ner: 105, tmpe: 0.25 },
];

// ============================================================================
// LECTURA INDIVIDUAL (por punto fijo)
// 10 lecturas de NSCEA,T en dB(A) por punto
// ============================================================================
const lecturaSchema = new mongoose.Schema({
  numero:    { type: Number, required: true },
  nscea_t:   { type: Number, required: true }, // dB(A) lectura estable
  nscea_t_inestable: { type: Number },          // dB(A) lectura inestable
}, { _id: false });

// ============================================================================
// NPA POR BANDA DE OCTAVA (opcional, para selección de EPP)
// ============================================================================
const npaBandaSchema = new mongoose.Schema({
  frecuencia_hz: { type: Number }, // 31.5, 63, 125, 250, 500, 1000, 2000, 4000, 6000, 8000
  npa_db:        { type: Number },
}, { _id: false });

// ============================================================================
// PUNTO DE MEDICIÓN — PUESTO FIJO
// ============================================================================
const puntoFijoSchema = new mongoose.Schema({
  numero:              { type: Number, required: true },
  area:                { type: String, required: true },
  ubicacion:           { type: String },
  tipo_ruido:          { type: String, enum: ['Estable', 'Inestable', 'Impulsivo'], default: 'Estable' },
  trabajadores_expuestos: { type: Number },
  puesto_trabajo:      { type: String },
  tiempo_exposicion_h: { type: Number, required: true }, // ti
  jornada_laboral_h:   { type: Number, required: true }, // Te

  // Condiciones
  calibracion_inicial: { type: Number },
  calibracion_final:   { type: Number },
  hora_inicio:         { type: String },
  hora_fin:            { type: String },

  // Lecturas
  lecturas: [lecturaSchema],

  // NPA por bandas (opcional)
  npa_bandas: [npaBandaSchema],

  // Resultados calculados
  nscea_t_promedio:    { type: Number }, // promedio energético de lecturas
  ner:                 { type: Number }, // Nivel de Exposición a Ruido
  lmpe:                { type: Number }, // Límite Máximo Permisible
  tmpe:                { type: Number }, // Tiempo Máximo Permisible
  cumple:              { type: Boolean },
  observaciones:       { type: String },
}, { _id: true });

// ============================================================================
// DOSIMETRÍA — EVALUACIÓN PERSONAL
// ============================================================================
const dosimetriaSchema = new mongoose.Schema({
  numero:              { type: Number, required: true },
  area:                { type: String, required: true },
  nombre_trabajador:   { type: String, required: true },
  puesto:              { type: String },

  // Datos del dosímetro usado
  dosimetro_marca:     { type: String },
  dosimetro_modelo:    { type: String },
  dosimetro_serie:     { type: String },

  // Medición
  porcentaje_dosis_inicial: { type: Number, default: 0 },
  porcentaje_dosis_final:   { type: Number, required: true },
  tiempo_medicion_h:        { type: Number, required: true },
  jornada_laboral_h:        { type: Number, required: true },
  calibracion_inicial:      { type: Number },
  calibracion_final:        { type: Number },
  hora_inicio:              { type: String },
  hora_fin:                 { type: String },
  condiciones:              { type: String },

  // Resultados calculados
  ner:     { type: Number }, // NER calculado desde dosis
  lmpe:    { type: Number },
  cumple:  { type: Boolean },
  observaciones: { type: String },
}, { _id: true });

// ============================================================================
// VERIFICACIÓN DEL EQUIPO
// ============================================================================
const verificacionEquipoSchema = new mongoose.Schema({
  fecha:               { type: Date, default: Date.now },
  verificado_por:      { type: String },
  calibracion_inicial: { type: Number },
  calibracion_final:   { type: Number },
  cumple_criterio:     { type: Boolean },
  condiciones:         { type: String },
}, { _id: false });

// ============================================================================
// ESTUDIO PRINCIPAL NOM-011
// ============================================================================
const estudioSchema = new mongoose.Schema({

  numero_informe: { type: String, required: true, unique: true, trim: true },
  orden_servicio: { type: String, required: true, trim: true },

  estado: {
    type:    String,
    enum:    ['reconocimiento', 'medicion', 'calculado', 'informe', 'validado'],
    default: 'reconocimiento',
  },

  historial_estados: [{
    estado:      String,
    fecha:       { type: Date, default: Date.now },
    usuario:     String,
    observacion: String,
  }],

  fecha_reconocimiento: Date,
  fecha_medicion:       Date,
  fecha_informe:        Date,
  fecha_recepcion:      Date,
  fecha_emision:        Date,

  empresa:             empresaSchema,
  sonometro:           { type: mongoose.Schema.Types.ObjectId, ref: 'SonometroIntegrador011' },
  verificacion_equipo: verificacionEquipoSchema,

  // Datos del reconocimiento inicial
  condiciones_operacion: { type: String, default: 'Condiciones Normales de Operación en Planta.' },
  porcentaje_produccion: { type: Number },
  turno:                 { type: String },
  jornada_laboral_h:     { type: Number },

  // Puntos de medición
  puntos_fijos:   [puntoFijoSchema],
  dosimetrias:    [dosimetriaSchema],

  // Resultados globales
  resultados: {
    // Puesto fijo
    total_puntos_fijos:         { type: Number, default: 0 },
    total_puntos_fijos_cumplen: { type: Number, default: 0 },
    puntos_fallidos:            [{ type: Number }],

    // Dosimetría
    total_dosimetrias:          { type: Number, default: 0 },
    total_dosimetrias_cumplen:  { type: Number, default: 0 },
    dosimetrias_fallidas:       [{ type: Number }],

    conclusion_general: { type: String },
    regla_decision: {
      type: String,
      default: 'La evaluación se realizó conforme al capítulo 7 de la NOM-011-STPS-2001 y los Límites Máximos Permisibles de Exposición indicados en el Apéndice A, Tabla 1.',
    },
  },

  responsable_estudio: { type: String },
  verificador:         { type: String },
  supervisor:          { type: String },
  ingeniero_servicio:  { type: String },
  observaciones:       { type: String, default: 'Ninguna.' },
  metodo:              { type: String, default: 'NOM-011-STPS-2001' },

}, {
  timestamps: {
    createdAt: 'creado_en',
    updatedAt: 'actualizado_en',
  },
});

// ============================================================================
// ÍNDICES
// ============================================================================
estudioSchema.index({ orden_servicio: 1 });
estudioSchema.index({ estado: 1 });
estudioSchema.index({ 'empresa.razon_social': 1 });
estudioSchema.index({ fecha_medicion: -1 });
estudioSchema.index({ estado: 1, fecha_medicion: -1 });
estudioSchema.index({ 'resultados.puntos_fallidos': 1 });
estudioSchema.index({ 'puntos_fijos.cumple': 1 });
estudioSchema.index({ 'dosimetrias.cumple': 1 });

sonometroIntegradorSchema.index({ activo: 1 });
sonometroIntegradorSchema.index({ fecha_vencimiento: 1 });
dosimetroSchema.index({ activo: 1 });
dosimetroSchema.index({ fecha_vencimiento: 1 });

// ============================================================================
// MODELOS
// ============================================================================
const SonometroIntegrador011 = connection.models.SonometroIntegrador011
  || connection.model('SonometroIntegrador011', sonometroIntegradorSchema);

const Dosimetro011 = connection.models.Dosimetro011
  || connection.model('Dosimetro011', dosimetroSchema);

const Estudio011 = connection.models.Estudio011
  || connection.model('Estudio011', estudioSchema);

module.exports = { SonometroIntegrador011, Dosimetro011, Estudio011, TABLA_LMPE };