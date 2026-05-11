'use strict';

const { SonometroIntegrador011, Dosimetro011, Estudio011 } = require('./model');

// ============================================================================
// SONÓMETRO INTEGRADOR
// ============================================================================

const sonometroRepository = {

  async crear(datos) {
    const sonometro = new SonometroIntegrador011(datos);
    await sonometro.save();
    return sonometro;
  },

  async listar() {
    return SonometroIntegrador011.find().sort({ creado_en: -1 });
  },

  async listarActivos() {
    return SonometroIntegrador011.find({ activo: true }).sort({ marca: 1, modelo: 1 });
  },

  async porId(id) {
    return SonometroIntegrador011.findById(id);
  },

  async porSerie(serie_id) {
    return SonometroIntegrador011.findOne({ serie_id });
  },

  async porVencer(dias = 30) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);
    return SonometroIntegrador011.find({
      activo: true,
      fecha_vencimiento: { $lte: fechaLimite, $gte: new Date() },
    }).sort({ fecha_vencimiento: 1 });
  },

  async actualizar(id, datos) {
    return SonometroIntegrador011.findByIdAndUpdate(
      id,
      { ...datos },
      { new: true, runValidators: true }
    );
  },

  async eliminar(id) {
    return SonometroIntegrador011.findByIdAndDelete(id);
  },
};

// ============================================================================
// DOSÍMETRO
// ============================================================================

const dosimetroRepository = {

  async crear(datos) {
    const dosimetro = new Dosimetro011(datos);
    await dosimetro.save();
    return dosimetro;
  },

  async listar() {
    return Dosimetro011.find().sort({ creado_en: -1 });
  },

  async listarActivos() {
    return Dosimetro011.find({ activo: true }).sort({ marca: 1, modelo: 1 });
  },

  async porId(id) {
    return Dosimetro011.findById(id);
  },

  async porSerie(serie_id) {
    return Dosimetro011.findOne({ serie_id });
  },

  async actualizar(id, datos) {
    return Dosimetro011.findByIdAndUpdate(
      id,
      { ...datos },
      { new: true, runValidators: true }
    );
  },

  async eliminar(id) {
    return Dosimetro011.findByIdAndDelete(id);
  },
};

// ============================================================================
// ESTUDIO
// ============================================================================

const estudioRepository = {

  async crear(datos) {
    const estudio = new Estudio011(datos);
    await estudio.save();
    return estudio;
  },

  async listar(filtros = {}) {
    const query = {};
    const limit = Math.max(0, Number(filtros.limit) || 20);
    const skip  = Math.max(0, Number(filtros.skip)  || 0);
    if (filtros.estado)  query.estado = filtros.estado;
    if (filtros.empresa) query['empresa.razon_social'] = new RegExp(filtros.empresa, 'i');
    if (filtros.desde || filtros.hasta) {
      query.fecha_medicion = {};
      if (filtros.desde) query.fecha_medicion.$gte = new Date(filtros.desde);
      if (filtros.hasta) query.fecha_medicion.$lte = new Date(filtros.hasta);
    }

    const [docs, total] = await Promise.all([
      Estudio011.find(query)
        .select('-puntos_fijos -dosimetrias')
        .populate('sonometro')
        .sort({ creado_en: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Estudio011.countDocuments(query),
    ]);

    return { docs, total };
  },

  async porId(id) {
    return Estudio011.findById(id).populate('sonometro');
  },

  async porNumeroInforme(numero) {
    return Estudio011.findOne({ numero_informe: numero });
  },

  async guardar(estudio) {
    return estudio.save();
  },
};

module.exports = { sonometroRepository, dosimetroRepository, estudioRepository };