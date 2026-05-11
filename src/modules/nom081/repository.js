'use strict';

const { EstudioRuidoNOM081, SonometroNOM081 } = require('./model');

// ============================================================================
// SONÓMETRO
// ============================================================================

const sonometroRepository = {

  async crear(datos) {
    const sonometro = new SonometroNOM081(datos);
    await sonometro.save();
    return sonometro;
  },

  async listar(filtros = {}) {
    const query = {};
    if (filtros.activo !== undefined) query.activo = filtros.activo === 'true';
    if (filtros.marca)  query.marca = new RegExp(filtros.marca, 'i');
    if (filtros.clase)  query.clase = filtros.clase;
    return SonometroNOM081.find(query).sort({ createdAt: -1 });
  },

  async buscar(filtros = {}) {
    const query = {};
    if (filtros.q) {
      query.$or = [
        { marca:    { $regex: filtros.q, $options: 'i' } },
        { modelo:   { $regex: filtros.q, $options: 'i' } },
        { serie_id: { $regex: filtros.q, $options: 'i' } },
      ];
    }
    if (filtros.marca)   query.marca    = { $regex: filtros.marca,   $options: 'i' };
    if (filtros.modelo)  query.modelo   = { $regex: filtros.modelo,  $options: 'i' };
    if (filtros.serie_id)query.serie_id = { $regex: filtros.serie_id,$options: 'i' };
    if (filtros.clase)   query.clase    = filtros.clase;
    if (filtros.activo !== undefined) query.activo = filtros.activo === 'true';
    return SonometroNOM081.find(query).sort({ createdAt: -1 });
  },

  async listarActivos() {
    return SonometroNOM081.find({ activo: true }).sort({ marca: 1, modelo: 1 });
  },

  async porVencer(dias = 30) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);
    return SonometroNOM081.find({
      activo: true,
      fecha_vencimiento: { $lte: fechaLimite, $gte: new Date() },
    }).sort({ fecha_vencimiento: 1 });
  },

  async porId(id) {
    return SonometroNOM081.findById(id);
  },

  async porSerie(serie_id) {
    return SonometroNOM081.findOne({ serie_id });
  },

  async actualizar(id, datos) {
    return SonometroNOM081.findByIdAndUpdate(
      id,
      { ...datos, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  },

  async eliminar(id) {
    return SonometroNOM081.findByIdAndDelete(id);
  },
};

// ============================================================================
// ESTUDIO
// ============================================================================

const estudioRepository = {

  async crear(datos) {
    const estudio = new EstudioRuidoNOM081(datos);
    await estudio.save();
    return estudio;
  },

  async listar(filtros = {}) {
    const query = {};
    const limit = Math.max(0, Number(filtros.limit) || 20);
    const skip  = Math.max(0, Number(filtros.skip)  || 0);
    if (filtros.orden_servicio) query.orden_servicio = filtros.orden_servicio;
    if (filtros.empresa) query['empresa.razon_social'] = new RegExp(filtros.empresa, 'i');
    if (filtros.desde || filtros.hasta) {
      query.fecha_medicion = {};
      if (filtros.desde) query.fecha_medicion.$gte = new Date(filtros.desde);
      if (filtros.hasta) query.fecha_medicion.$lte = new Date(filtros.hasta);
    }
    return EstudioRuidoNOM081
      .find(query)
      .populate('sonometro')
      .select('numero_informe orden_servicio empresa fecha_medicion conclusion estado')
      .sort({ fecha_medicion: -1 })
      .limit(limit)
      .skip(skip);
  },

  async porId(id) {
    return EstudioRuidoNOM081.findById(id).populate('sonometro');
  },

  async porNumeroInforme(numero) {
    return EstudioRuidoNOM081.findOne({ numero_informe: numero }).populate('sonometro');
  },

  async actualizar(id, datos) {
    return EstudioRuidoNOM081.findByIdAndUpdate(
      id,
      { ...datos, actualizado_en: new Date() },
      { new: true, runValidators: true }
    );
  },

  async eliminar(id) {
    return EstudioRuidoNOM081.findByIdAndDelete(id);
  },
};

module.exports = { sonometroRepository, estudioRepository };