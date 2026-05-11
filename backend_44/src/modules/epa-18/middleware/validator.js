'use strict';

const Muestreo = require('./muestreo.models');

// ============================================================================
// HELPER
// ============================================================================

function normalizarCodigo(codigo) {
  return codigo.replace(/-(?=\d{6})/, '/');
}

// ============================================================================
// HISTORIAL
// ============================================================================

async function agregarAlHistorial(doc, nuevoEstado, usuario = null, observacion = null) {
  doc.historial_estados = doc.historial_estados || [];
  doc.historial_estados.push({
    estado:      nuevoEstado,
    fecha:       new Date(),
    usuario:     usuario || 'sistema',
    observacion: observacion || `Cambio de estado a ${nuevoEstado}`,
  });
  doc.estado = nuevoEstado;
  await doc.save();
}

// ============================================================================
// REPOSITORY
// ============================================================================

const muestreoRepository = {

  async crear(datos) {
    const doc = new Muestreo(datos);
    await doc.save();
    return doc;
  },

  async porCodigo(codigo) {
    return Muestreo.findOne({ codigo_muestra: normalizarCodigo(codigo) });
  },

  async porCodigoLean(codigo) {
    return Muestreo.findOne({ codigo_muestra: normalizarCodigo(codigo) }).lean();
  },

  async listar(filtros = {}) {
    const { orden_servicio, empresa, estado, desde, hasta, limit = 20, skip = 0 } = filtros;

    const query = {};
    if (orden_servicio) query.orden_servicio = orden_servicio;
    if (empresa)        query['empresa.razon_social'] = new RegExp(empresa, 'i');
    if (estado)         query.estado = estado;
    if (desde || hasta) {
      query.fecha_muestreo = {};
      if (desde) query.fecha_muestreo.$gte = new Date(desde);
      if (hasta) query.fecha_muestreo.$lte = new Date(hasta);
    }

    const [docs, total] = await Promise.all([
      Muestreo.find(query)
        .select('-resultados.analitos -medicion_campo.puntos -determinacion_humedad.impactores')
        .sort({ fecha_muestreo: -1 })
        .limit(Number(limit))
        .skip(Number(skip))
        .lean(),
      Muestreo.countDocuments(query),
    ]);

    return { docs, total };
  },

  async actualizar(codigo, campos) {
    return Muestreo.findOneAndUpdate(
      { codigo_muestra: normalizarCodigo(codigo) },
      { $set: campos },
      { new: true, runValidators: true }
    );
  },

  async eliminar(codigo) {
    return Muestreo.findOneAndDelete({ codigo_muestra: normalizarCodigo(codigo) });
  },

  async guardar(doc) {
    return doc.save();
  },

  agregarAlHistorial,
};

module.exports = { muestreoRepository, normalizarCodigo };