'use strict';

const { Terrometro, Multimetro, Estudio022 } = require('./model');

// ============================================================================
// TERRÓMETRO
// ============================================================================

const terrometroRepository = {

  async crear(datos) {
    const terrometro = new Terrometro(datos);
    await terrometro.save();
    return terrometro;
  },

  async listar() {
    return Terrometro.find().sort({ creado_en: -1 });
  },

  async listarActivos() {
    return Terrometro.find({ activo: true }).sort({ marca: 1, modelo: 1 });
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
    if (filtros.marca)    query.marca    = { $regex: filtros.marca,    $options: 'i' };
    if (filtros.modelo)   query.modelo   = { $regex: filtros.modelo,   $options: 'i' };
    if (filtros.serie_id) query.serie_id = { $regex: filtros.serie_id, $options: 'i' };
    if (filtros.activo !== undefined) query.activo = filtros.activo === 'true';
    return Terrometro.find(query).sort({ creado_en: -1 });
  },

  async porVencer(dias = 30) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);
    return Terrometro.find({
      activo: true,
      fecha_vencimiento: { $lte: fechaLimite, $gte: new Date() },
    }).sort({ fecha_vencimiento: 1 });
  },

  async porId(id) {
    return Terrometro.findById(id);
  },

  async porSerie(serie_id) {
    return Terrometro.findOne({ serie_id });
  },

  async actualizar(id, datos) {
    return Terrometro.findByIdAndUpdate(
      id,
      { ...datos, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  },

  async eliminar(id) {
    return Terrometro.findByIdAndDelete(id);
  },
};

// ============================================================================
// MULTÍMETRO
// ============================================================================

const multimetroRepository = {

  async crear(datos) {
    const multimetro = new Multimetro(datos);
    await multimetro.save();
    return multimetro;
  },

  async listar() {
    return Multimetro.find().sort({ creado_en: -1 });
  },

  async listarActivos() {
    return Multimetro.find({ activo: true }).sort({ marca: 1, modelo: 1 });
  },

  async porId(id) {
    return Multimetro.findById(id);
  },

  async porSerie(serie_id) {
    return Multimetro.findOne({ serie_id });
  },

  async actualizar(id, datos) {
    return Multimetro.findByIdAndUpdate(
      id,
      { ...datos, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  },

  async eliminar(id) {
    return Multimetro.findByIdAndDelete(id);
  },
};

// ============================================================================
// ESTUDIO
// ============================================================================

const estudioRepository = {

  async crear(datos) {
    const estudio = new Estudio022(datos);
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
      Estudio022.find(query)
        .select('-pozos -continuidades')
        .populate('terrometro')
        .populate('multimetro')
        .sort({ creado_en: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Estudio022.countDocuments(query),
    ]);

    return { docs, total };
  },

  async porId(id) {
    return Estudio022.findById(id)
      .populate('terrometro')
      .populate('multimetro');
  },

  async porIdLean(id) {
    return Estudio022.findById(id)
      .populate('terrometro')
      .populate('multimetro')
      .lean();
  },

  async porNumeroInforme(numero) {
    return Estudio022.findOne({ numero_informe: numero });
  },

  async guardar(estudio) {
    return estudio.save();
  },
};

module.exports = { terrometroRepository, multimetroRepository, estudioRepository };
