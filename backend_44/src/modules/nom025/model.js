// src/modules/nom025/model.js
'use strict';

const mongoose = require('mongoose');
const empresaSchema = require('../../models/empresa.model');
const { getConnection } = require('../../connections/pool');

const connection = getConnection('nom025');

// ============================================================================
// FACTOR DE CORRECCIÓN — Formato del certificado real (SIMH-OPTICA/0008-2025)
//
// El Excel selecciona el factor usando:
//   INDEX(FC, MATCH(MIN(ABS(ILUM_REF - lux)), ABS(ILUM_REF - lux), 0))
// Es decir: el factor cuya iluminancia_ref sea la más cercana al lux medido.
//
// Campos:
//   iluminancia_ref  = iluminancia de referencia del certificado (lux)
//   factor           = factor de corrección en ese punto
// ============================================================================
const factorCorreccionSchema = new mongoose.Schema({
  iluminancia_ref: { type: Number, required: true },
  factor:          { type: Number, required: true }
}, { _id: false });

// ============================================================================
// LUXÓMETRO
//
// u_relativa: incertidumbre relativa del certificado (fracción, no porcentaje)
//   Ejemplo: 3.66% → u_relativa = 0.0366
//   UE por lectura = lux_corregido × u_relativa
//   Viene de la celda Generador!F9 → "Incertidumbre de Acuerdo al Equipo: 3.66"
// ============================================================================
const luxometroSchema = new mongoose.Schema({
  marca:               { type: String, required: true },
  modelo:              { type: String, required: true },
  serie_id:            { type: String, required: true, unique: true },
  fecha_calibracion:   { type: Date,   required: true },
  fecha_vencimiento:   { type: Date,   required: true },
  factores_correccion: [factorCorreccionSchema],
  u_relativa:          { type: Number, default: 0.0366 },
  certificado:         { type: String },
  activo:              { type: Boolean, default: true }
}, { timestamps: true });

// ============================================================================
// LUMINARIA
// ============================================================================
const luminariaSchema = new mongoose.Schema({
  cantidad:   { type: Number },
  tipo:       { type: String },
  potencia:   { type: Number },
  localizada: { type: Boolean, default: false }
}, { _id: false });

// ============================================================================
// ÁREA DE TRABAJO
// ============================================================================
const areaSchema = new mongoose.Schema({
  nombre:           { type: String, required: true },
  dimension_largo:  { type: Number, required: true },
  dimension_ancho:  { type: Number, required: true },
  altura_montaje:   { type: Number, required: true },
  indice_area:      { type: Number },
  puntos_minimos:   { type: Number },
  tarea_visual:     { type: String },
  nmi_requerido:    { type: Number, required: true },
  tipo_iluminacion: { type: String, enum: ['Natural', 'Artificial', 'Mixta'], set: (v) => v?.trim(), default: 'Artificial' },
  luminarias:       [luminariaSchema],
  superficie_color: { type: String },
  observaciones:    { type: String },
  promedio_lux:     { type: Number },
  cumple_lux:       { type: Boolean },
  cumple_reflexion: { type: Boolean },
  cumple_total:     { type: Boolean }
}, { _id: true });

// ============================================================================
// LECTURA INDIVIDUAL
//
// Fórmulas que replica el Excel (HM-T, certificado SIMH-OPTICA/0008-2025):
//
//   lux_corregido = lux_medido × fc(lux_medido)
//     donde fc(x) = factor del punto de calibración con iluminancia_ref más cercana a x
//     Fórmula Excel C38: INDEX(FC, MATCH(MIN(ABS(ILUM_REF-lux)), ABS(ILUM_REF-lux), 0)) × lux
//
//   kf_plano (%) = (fc(e1_plano) × e1_plano) / (fc(e2_plano) × e2_plano) × 100
//     Cada valor E1 y E2 se corrige con su propio factor independiente.
//     Fórmula Excel C39: (fc(E1)×E1) / (fc(E2)×E2) × 100
//     → cumple si kf_plano ≤ 50%
//
//   kf_pared (%) = (fc(e1_pared) × e1_pared) / (fc(e2_pared) × e2_pared) × 100
//     → cumple si kf_pared ≤ 60%
//
//   UE (lux) = lux_corregido × u_relativa
//     donde u_relativa = 0.0366 (3.66% del certificado, celda Generador!F9)
//     Fórmula Excel T19: Q19 × U84/100 donde U84 = 3.66
//     → expresado en informe como ± UE lux
//
//   cumple_lux = (lux_corregido - UE) >= NMI   [Regla ILAC-G8]
// ============================================================================
const lecturaSchema = new mongoose.Schema({
  hora:          { type: String },
  lux_medido:    { type: Number, required: true },
  lux_corregido: { type: Number },
  e1_plano:      { type: Number },
  e2_plano:      { type: Number },
  kf_plano:      { type: Number },
  e1_pared:      { type: Number },
  e2_pared:      { type: Number },
  kf_pared:      { type: Number },
  ue:            { type: Number },
  cumple_lux:    { type: Boolean },
  cumple_plano:  { type: Boolean },
  cumple_pared:  { type: Boolean }
}, { _id: false });

// ============================================================================
// PUNTO DE MEDICIÓN
//
// Campos del informe (hoja HM-T del Excel, filas 29-36):
//   descripcion_tarea_visual_nom025  "Distinción moderada de detalles"
//   descripcion_tarea_localizada     "No Aplica"
//   tipo_luminarias                  "LED - Ahorradoras"
//   cantidad_luminarias              "2 - 2"
//   potencia_luminarias              "24 - 30"
//   metodo_cantidad                  "PT / 1"
//   trabajadores_expuestos           1
//   puesto_trabajo                   "Personal de Ventas"
//   descripcion_actividades          texto largo del POE
//
// Resultados consolidados:
//   promedio_lux_corregido = (1/N) × Σ lux_corregido_i
//   promedio_kf_plano      = (1/N) × Σ kf_plano_i
//   promedio_kf_pared      = (1/N) × Σ kf_pared_i
//   ue_max                 = max(UE_i)   [criterio conservador ILAC-G8]
//   cumple_lux             = (promedio_lux_corregido - ue_max) >= nmi_requerido
//   cumple_plano           = todas las lecturas ≤ 50%
//   cumple_pared           = todas las lecturas ≤ 60% (o N/A)
//   cumple_total           = cumple_lux && cumple_plano && cumple_pared
// ============================================================================
const puntoMedicionSchema = new mongoose.Schema({
  numero:           { type: Number, required: true },
  area_id:          { type: mongoose.Schema.Types.ObjectId, required: true },
  ubicacion:        { type: String },
  tipo_iluminacion: { type: String, enum: ['Natural', 'Artificial', 'Mixta'] },
  iluminacion_tipo: { type: String, enum: ['General', 'Localizada'], set: (v) => v?.trim() },
  nmi_requerido:    { type: Number },
  tarea_visual:     { type: String },
  superficie_color: { type: String },

  // Campos del informe HM-T
  descripcion_tarea_visual_nom025: { type: String },
  descripcion_tarea_localizada:    { type: String },
  tipo_luminarias:                 { type: String },
  cantidad_luminarias:             { type: String },
  potencia_luminarias:             { type: String },
  metodo_cantidad:                 { type: String },
  trabajadores_expuestos:          { type: Number },
  puesto_trabajo:                  { type: String },
  descripcion_actividades:         { type: String },

  // Lecturas (1-3 por punto)
  lecturas: [lecturaSchema],

  // Resultados consolidados
  promedio_lux_corregido: { type: Number },
  promedio_kf_plano:      { type: Number },
  promedio_kf_pared:      { type: Number },
  ue_max:                 { type: Number },
  cumple_lux:             { type: Boolean },
  cumple_plano:           { type: Boolean },
  cumple_pared:           { type: Boolean },
  cumple_total:           { type: Boolean }
}, { _id: true });

// ============================================================================
// VERIFICACIÓN DEL EQUIPO
// ============================================================================
const verificacionEquipoSchema = new mongoose.Schema({
  fecha:           { type: Date,    default: Date.now },
  verificado_por:  { type: String },
  lectura_inicial: { type: Number },
  lectura_final:   { type: Number },
  condiciones:     { type: String },
  cumple_criterio: { type: Boolean }
}, { _id: false });

// ============================================================================
// ESTUDIO PRINCIPAL
// ============================================================================
const estudioSchema = new mongoose.Schema({

  folio:          { type: String, required: true, unique: true, trim: true },
  orden_servicio: { type: String, required: true, trim: true },

  estado: {
    type: String,
    enum: ['reconocimiento', 'medicion', 'calculado', 'informe', 'validado'],
    default: 'reconocimiento'
  },

  historial_estados: [{
    estado:String,
    fecha:{ type: Date, default: Date.now },
    usuario:String,
    observacion: String
  }],

  fecha_reconocimiento: Date,
  fecha_medicion:Date,
  fecha_informe:Date,

  empresa:empresaSchema,
  luxometro:{ type: mongoose.Schema.Types.ObjectId, ref: 'Luxometro' },
  verificacion_equipo: verificacionEquipoSchema,

  areas:  [areaSchema],
  puntos: [puntoMedicionSchema],

  resultados: {
    total_puntos_medidos:    { type: Number, default: 0 },
    total_puntos_cumplen:    { type: Number, default: 0 },
    porcentaje_cumplimiento: { type: Number },
    incertidumbre_expandida: { type: Number, default: 3.66 },
    conclusion_general:      { type: String },
    puntos_fallidos:         [{ type: Number }],
    regla_decision: {
      type: String,
      default: 'Se emplea una "Regla de Decisión de Aceptación Simple" como lo establece el documento "Guidelines on Decision Rules of Conformity" ILAC-G8:09/2019. La incertidumbre estimada UE, se expresa con un factor de cobertura k=2 que corresponde aproximadamente a un nivel de confianza del 95%. Se calcula basándose en la guía para la expresión de incertidumbre en los resultados de las mediciones (NMX-CH-140-IMNC-2002).'
    }
  },

  responsable_estudio: { type: String },
  verificador:         { type: String },
  supervisor:          { type: String },
  plano_url:           { type: String },
  diagrama_url:        { type: String },
  observaciones:       { type: String, default: 'Ninguna.' },
  metodo:              { type: String, default: 'NOM-025-STPS-2008' }

}, {
  timestamps: {
    createdAt: 'creado_en',
    updatedAt: 'actualizado_en'
  }
});

estudioSchema.index({ orden_servicio: 1 });
estudioSchema.index({ estado: 1 });
estudioSchema.index({ 'empresa.razon_social': 1 });

// Índice compuesto — listados filtrados por estado + fecha
estudioSchema.index({ estado: 1, fecha_medicion: -1 });

// Luxómetro
luxometroSchema.index({ activo: 1 });
luxometroSchema.index({ fecha_vencimiento: 1 });

module.exports = {
  Estudio:   connection.model('Estudio',   estudioSchema),
  Luxometro: connection.model('Luxometro', luxometroSchema)
};