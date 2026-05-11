// src/modules/nom081/model.js
'use strict';

const mongoose = require('mongoose');
const empresaSchema = require('../../models/empresa.model');
const { getConnection } = require('../../connections/pool');

const connection = getConnection('nom081');

// ============================================================================
// PUNTO DE CALIBRACIÓN DEL SONÓMETRO (por frecuencia)
// ============================================================================
const puntoCalibracionSchema = new mongoose.Schema({
  frecuencia_hz: { type: Number, required: true },
  correccion_db: { type: Number, required: true },
  incertidumbre_db: { type: Number, default: null }
}, { _id: false });

// ============================================================================
// SONÓMETRO NOM081 (nombre único para evitar conflicto)
// ============================================================================
const sonometroNOM081Schema = new mongoose.Schema({
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  serie_id: { type: String, required: true, unique: true },
  clase: { 
    type: String, 
    enum: ['Clase 1', 'Clase 2', 'Tipo 1', 'Tipo 2'], 
    required: true 
  },
  fecha_calibracion: { type: Date, required: true },
  fecha_vencimiento: { type: Date, required: true },
  certificado: { type: String, required: true },
  incertidumbre_global: { type: Number, required: true },
  tipo_incertidumbre: {
    type: String,
    enum: ['porcentaje', 'db'],
    default: 'db'
  },
  calibracion_frecuencias: [puntoCalibracionSchema],
  calibrador_asociado: {
    marca: { type: String },
    modelo: { type: String },
    serie: { type: String },
    certificado: { type: String },
    fecha_calibracion: { type: Date },
    fecha_vencimiento: { type: Date }
  },
  activo: { type: Boolean, default: true },
  observaciones: { type: String }
}, { timestamps: true });

// ============================================================================
// LECTURAS POR PUNTO (35 lecturas por punto A-E o I-V)
// ============================================================================
const lecturasPuntoSchema = new mongoose.Schema({
  lecturas: [Number],
  n50: Number,
  sigma: Number,
  n10: Number,
  neq: Number
}, { _id: false });

// ============================================================================
// MEDICIÓN COMPLETA (fuente o fondo, 5 puntos A,B,C,D,E)
// ============================================================================
const medicionPuntosSchema = new mongoose.Schema({
  puntoA: lecturasPuntoSchema,
  puntoB: lecturasPuntoSchema,
  puntoC: lecturasPuntoSchema,
  puntoD: lecturasPuntoSchema,
  puntoE: lecturasPuntoSchema,
  hora_inicio: String,
  hora_fin: String
}, { _id: false });

// ============================================================================
// RESULTADO POR PERÍODO (diurno/nocturno)
// ============================================================================
const resultadoPeriodoSchema = new mongoose.Schema({
  fuente: {
    promedios: {
      n50: Number,
      sigma: Number,
      n10: Number,
      neq: Number
    }
  },
  fondo: {
    promedios: {
      n50: Number,
      sigma: Number,
      n10: Number,
      neq: Number
    }
  },
  ce: Number,
  delta50: Number,
  cf: Number,
  nPrima50: Number,
  nivelFinal: Number,
  observacion: String,
  limite: Number,
  cumple: Boolean,
  horario: String,
  incertidumbre: Number
}, { _id: false });

// ============================================================================
// ACTIVIDAD RUIDOSA DE LA FUENTE FIJA
// ============================================================================
const actividadRuidosoSchema = new mongoose.Schema({
  actividad: { type: String },
  equipo: { type: String },
  energia: { type: String },
  capacidad: { type: String },
  horas_operacion: { type: String },
  ns_dba: { type: Number }
}, { _id: false });

// ============================================================================
// COLINDANCIAS
// ============================================================================
const colindanciasSchema = new mongoose.Schema({
  norte: { type: String },
  sur: { type: String },
  este: { type: String },
  oeste: { type: String }
}, { _id: false });

// ============================================================================
// ZONA CRÍTICA
// ============================================================================
const zonaCriticaSchema = new mongoose.Schema({
  identificacion: { type: String },
  ubicacion: { type: String },
  colindancia: { type: String },
  distancia_limite_predio: { type: Number },
  altura_microfono: { type: Number }
}, { _id: false });

// ============================================================================
// EQUIPOS DE MEDICIÓN (completo con termohigroanemómetro)
// ============================================================================
const equiposMedicionSchema = new mongoose.Schema({
  sonometro: {
    marca: { type: String },
    modelo: { type: String },
    serie: { type: String }
  },
  calibrador: {
    marca: { type: String },
    modelo: { type: String },
    serie: { type: String }
  },
  termohigroanemometro: {
    marca: { type: String },
    modelo: { type: String },
    serie: { type: String }
  }
}, { _id: false });

// ============================================================================
// VERIFICACIÓN DEL EQUIPO EN CAMPO
// ============================================================================
const verificacionEquipoSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  verificado_por: { type: String },
  calibracion_inicial: { type: Number },
  calibracion_final: { type: Number },
  condiciones: { type: String },
  cumple_criterio: { type: Boolean }
}, { _id: false });

// ============================================================================
// ESTUDIO DE RUIDO NOM081 (antes "Muestreo" - nombre único)
// ============================================================================
const estudioRuidoNOM081Schema = new mongoose.Schema({
  numero_informe: { type: String, required: true, unique: true, trim: true },
  orden_servicio: { type: String, required: true, trim: true },

  estado: {
    type: String,
    enum: ['reconocimiento', 'medicion', 'calculado', 'informe', 'validado'],
    default: 'reconocimiento'
  },

  historial_estados: [{
    estado: String,
    fecha: { type: Date, default: Date.now },
    usuario: String,
    observacion: String
  }],

  fecha_reconocimiento: Date,
  fecha_medicion: Date,
  fecha_informe: Date,
  fecha_recepcion: Date,
  fecha_emision: Date,

  empresa: empresaSchema,
  sonometro: { type: mongoose.Schema.Types.ObjectId, ref: 'SonometroNOM081' },
  verificacion_equipo: verificacionEquipoSchema,

  fuente_fija: {
    horario_operacion: { type: String },
    elemento_constructivo: { type: String },
    tipo_medicion: { type: String, enum: ['Continua', 'Semicontinua'], default: 'Semicontinua' },
    actividades_ruidosas: [actividadRuidosoSchema]
  },

  colindancias: colindanciasSchema,
  zona_critica: zonaCriticaSchema,

  zona_tipo: { 
    type: String, 
    enum: [
      'Industrial y Comercial', 
      'Residencial (Exteriores)', 
      'Escuelas (Áreas Exteriores de Juego)', 
      'Ceremonias, Festivales y Eventos de Entretenimiento.'
    ], 
    required: true 
  },

  equipos_medicion: equiposMedicionSchema,

  condiciones_ambientales: {
    velocidad_viento: { type: Number, default: null },
    temperatura: { type: Number, default: null },
    presion_barometrica: { type: Number, default: null },
    observaciones: { type: String }
  },

  mediciones: {
    diurno: {
      fuente: medicionPuntosSchema,
      fondo: medicionPuntosSchema
    },
    nocturno: {
      fuente: medicionPuntosSchema,
      fondo: medicionPuntosSchema
    }
  },

  resultados: {
    diurno: resultadoPeriodoSchema,
    nocturno: resultadoPeriodoSchema
  },

  conclusion: {
    texto: String,
    diurno_cumple: Boolean,
    nocturno_cumple: Boolean,
    regla_decision: {
      type: String,
      default: 'Se emplea una "Regla de Decisión de Aceptación Simple" como lo establece el documento "Guidelines on Decision Rules of Conformity" ILAC-G8:09/2019. La incertidumbre estimada UE, se expresa con un factor de cobertura k=2 que corresponde aproximadamente a un nivel de confianza del 95%. Se calcula basándose en la guía para la expresión de incertidumbre en los resultados de las mediciones (NMX-CH-140-IMNC-2002).'
    }
  },

  responsable_estudio: { type: String },
  verificador: { type: String },
  supervisor: { type: String },
  ingeniero_servicio: { type: String },

  croquis_url: { type: String },
  diagrama_url: { type: String },

  observaciones: { type: String, default: 'Ninguna.' },
  metodo: { type: String, default: 'NOM-081-SEMARNAT-1994' }

}, {
  timestamps: {
    createdAt: 'creado_en',
    updatedAt: 'actualizado_en'
  }
});

// Índices

estudioRuidoNOM081Schema.index({ 'resultados.diurno.cumple': 1 });
estudioRuidoNOM081Schema.index({ 'resultados.nocturno.cumple': 1 });
estudioRuidoNOM081Schema.index({ 'conclusion.diurno_cumple': 1 });
estudioRuidoNOM081Schema.index({ 'conclusion.nocturno_cumple': 1 });
estudioRuidoNOM081Schema.index({ fecha_medicion: -1 });
estudioRuidoNOM081Schema.index({ estado: 1, fecha_medicion: -1 });

sonometroNOM081Schema.index({ activo: 1 });
sonometroNOM081Schema.index({ fecha_vencimiento: 1 });

// Verificar si los modelos ya existen para evitar OverwriteModelError
const SonometroNOM081 = connection.models.SonometroNOM081 || connection.model('SonometroNOM081', sonometroNOM081Schema);
const EstudioRuidoNOM081 = connection.models.EstudioRuidoNOM081 || connection.model('EstudioRuidoNOM081', estudioRuidoNOM081Schema);

module.exports = {
  EstudioRuidoNOM081,
  SonometroNOM081
};