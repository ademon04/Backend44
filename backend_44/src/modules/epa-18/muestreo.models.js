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
  frecuencia_hz: { type: Number, required: true },    // 125, 250, 500, 1000, 2000, 4000, 8000
  correccion_db: { type: Number, required: true },    // Corrección en dB para esa frecuencia
  incertidumbre_db: { type: Number, default: null }   // Incertidumbre específica por frecuencia (opcional)
}, { _id: false });

// ============================================================================
// SONÓMETRO (equivalente al Luxometro de NOM-025)
// ============================================================================
const sonometroSchema = new mongoose.Schema({
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  serie_id: { type: String, required: true, unique: true },
  
  // Clase del sonómetro (I = más preciso, II = estándar)
  clase: { 
    type: String, 
    enum: ['Clase 1', 'Clase 2', 'Tipo 1', 'Tipo 2'], 
    required: true 
  },
  
  fecha_calibracion: { type: Date, required: true },
  fecha_vencimiento: { type: Date, required: true },
  certificado: { type: String, required: true },
  
  // Incertidumbre global del instrumento
  incertidumbre_global: { type: Number, required: true },
  tipo_incertidumbre: {
    type: String,
    enum: ['porcentaje', 'db'],
    default: 'db'
  },
  
  // Puntos de calibración por frecuencia
  calibracion_frecuencias: [puntoCalibracionSchema],
  
  // Calibrador acústico asociado
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
  lecturas: [Number],  // Array de 35 valores dB(A)
  n50: Number,         // Promedio aritmético
  sigma: Number,       // Desviación estándar
  n10: Number,         // Percentil 90%
  neq: Number          // Nivel equivalente
}, { _id: false });

// ============================================================================
// MEDICIÓN COMPLETA (fuente o fondo, 5 puntos)
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
  ce: Number,           // Corrección por extremos
  delta50: Number,      // Diferencia de promedios
  cf: Number,           // Corrección por ruido de fondo
  nPrima50: Number,     // N'50
  nivelFinal: Number,   // Resultado final dB(A)
  observacion: String,  // "No emite nivel sonoro" si aplica
  limite: Number,       // Límite según zona
  cumple: Boolean,      // ¿Cumple límite?
  horario: String,      // Horario del período
  incertidumbre: Number // Incertidumbre expandida (k=2) en dB
}, { _id: false });

// ============================================================================
// VERIFICACIÓN DEL EQUIPO EN CAMPO
// ============================================================================
const verificacionEquipoSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  verificado_por: { type: String },
  calibracion_inicial: { type: Number },  // dB(A)
  calibracion_final: { type: Number },    // dB(A)
  condiciones: { type: String },
  cumple_criterio: { type: Boolean }
}, { _id: false });

// ============================================================================
// ACTIVIDAD RUIDOSA DE LA FUENTE FIJA
// ============================================================================
const actividadRuidosoSchema = new mongoose.Schema({
  actividad: { type: String },           // Ej: "Extractor de aire"
  equipo: { type: String },              // Ej: "Extractor"
  energia: { type: String },             // Ej: "Eléctrica"
  capacidad: { type: String },           // Ej: "No disponible"
  horas_operacion: { type: String },     // Ej: "24"
  ns_dba: { type: Number }               // Ej: 76.5
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
  identificacion: { type: String },      // Ej: "Acceso a zona de embarques"
  ubicacion: { type: String },           // Ej: "Sur"
  colindancia: { type: String },         // Ej: "Circuit Progreso Norte"
  distancia_limite_predio: { type: Number }, // D1 en metros (ej: 0.3)
  altura_microfono: { type: Number }        // D2 en metros (ej: 1.2)
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
// MUESTREO PRINCIPAL (estudio de ruido) - COMPLETO
// ============================================================================
const muestreoSchema = new mongoose.Schema({
  // Identificación
  numero_informe: { type: String, required: true, unique: true, trim: true },
  orden_servicio: { type: String, required: true, trim: true },
  
  // Estado del estudio
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
  
  // Fechas
  fecha_reconocimiento: Date,
  fecha_medicion: Date,
  fecha_informe: Date,
  fecha_recepcion: Date,
  fecha_emision: Date,
  
  // Empresa (reutilizando schema genérico)
  empresa: empresaSchema,
  
  // Instrumentos
  sonometro: { type: mongoose.Schema.Types.ObjectId, ref: 'Sonometro' },
  equipos_medicion: equiposMedicionSchema,  // Nuevo: incluye termohigroanemómetro
  verificacion_equipo: verificacionEquipoSchema,
  
  // Zona de la empresa (para límites)
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
  
  // Datos de la fuente fija (NUEVO)
  fuente_fija: {
    horario_operacion: { type: String },        // Ej: "08:00 h - 17:00 h, 23:00 h - 08:00 h"
    elemento_constructivo: { type: String },    // Ej: "Malla ciclónica"
    tipo_medicion: { type: String, enum: ['Continua', 'Semicontinua'], default: 'Semicontinua' },
    actividades_ruidosas: [actividadRuidosoSchema]
  },
  
  // Colindancias (NUEVO)
  colindancias: colindanciasSchema,
  
  // Zona crítica (NUEVO)
  zona_critica: zonaCriticaSchema,
  
  // Condiciones ambientales
  condiciones_ambientales: {
    velocidad_viento: { type: Number, default: null },
    temperatura: { type: Number, default: null },
    presion_barometrica: { type: Number, default: null },
    observaciones: { type: String }
  },
  
  // Mediciones crudas (lo que llega del cliente)
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
  
  // Resultados calculados
  resultados: {
    diurno: resultadoPeriodoSchema,
    nocturno: resultadoPeriodoSchema
  },
  
  // Conclusión final
  conclusion: {
    texto: String,
    diurno_cumple: Boolean,
    nocturno_cumple: Boolean,
    regla_decision: {
      type: String,
      default: 'Se emplea una "Regla de Decisión de Aceptación Simple" como lo establece el documento "Guidelines on Decision Rules of Conformity" ILAC-G8:09/2019. La incertidumbre estimada UE, se expresa con un factor de cobertura k=2 que corresponde aproximadamente a un nivel de confianza del 95%. Se calcula basándose en la guía para la expresión de incertidumbre en los resultados de las mediciones (NMX-CH-140-IMNC-2002).'
    }
  },
  
  // Firmas (igual que NOM-025)
  responsable_estudio: { type: String },
  verificador: { type: String },
  supervisor: { type: String },
  ingeniero_servicio: { type: String },
  
  // Documentos adjuntos
  croquis_url: { type: String },
  diagrama_url: { type: String },
  
  // Metadatos
  observaciones: { type: String, default: 'Ninguna.' },
  metodo: { type: String, default: 'NOM-081-SEMARNAT-1994' }

}, {
  timestamps: {
    createdAt: 'creado_en',
    updatedAt: 'actualizado_en'
  }
});

// Índices
muestreoSchema.index({ orden_servicio: 1 });
muestreoSchema.index({ estado: 1 });
muestreoSchema.index({ 'empresa.razon_social': 1 });
muestreoSchema.index({ fecha_medicion: -1 });

module.exports = {
  Sonometro: connection.model('Sonometro', sonometroSchema),
  Muestreo:  connection.model('Muestreo',  muestreoSchema)
};