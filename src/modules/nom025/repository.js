'use strict';

const { filter } = require('pdfkit');
const { Estudio, Luxometro } = require('./model');

// ============================================================================
// LUXÓMETRO
// ============================================================================

const luxometroRepository = {

  async crear(datos) {
    const luxometro = new Luxometro(datos);
    await luxometro.save();
    return luxometro;
  },

  async listar() {
    return Luxometro.find().sort({ creado_en: -1 });
  },

  async listarActivos() {
    return Luxometro.find({ activo: true }).sort({ marca: 1, modelo: 1 });
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
    if (filtros.marca) query.marca = { $regex: filtros.marca,    $options: 'i' };
    if (filtros.modelo)  query.modelo = { $regex: filtros.modelo,   $options: 'i' };
    if (filtros.serie_id) query.serie_id = { $regex: filtros.serie_id, $options: 'i' };
    if (filtros.activo !== undefined) query.activo = filtros.activo === 'true';
    return Luxometro.find(query).sort({ creado_en: -1 });
  },

  async porMarca(marca) {
    return Luxometro.find({ marca: { $regex: marca, $options: 'i' } }).sort({ modelo: 1 });
  },

  async porVencer(dias = 30) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);
    return Luxometro.find({
      activo: true,
      fecha_vencimiento: { $lte: fechaLimite, $gte: new Date() },
    }).sort({ fecha_vencimiento: 1 });
  },

  async porId(id) {
    return Luxometro.findById(id);
  },

  async porSerie(serie_id) {
    return Luxometro.findOne({ serie_id });
  },
};

// ============================================================================
// ESTUDIO
// ============================================================================

const estudioRepository = {

  async crear(datos) {
    const estudio = new Estudio(datos);
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
      query.fecha_reconocimiento = {};
      if (filtros.desde) query.fecha_reconocimiento.$gte = new Date(filtros.desde);
      if (filtros.hasta) query.fecha_reconocimiento.$lte = new Date(filtros.hasta);
    }
      
      const [docs, total] = await Promise.all([
      Estudio.find(query)
        .select('-puntos')
        .populate('luxometro')
        .sort({ creado_en: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Estudio.countDocuments(query),
    ]);

    return { docs, total };
  },

  async porId(id) {
    return Estudio.findById(id).populate('luxometro');
  },

  async porIdLean(id) {
    return Estudio.findById(id).populate('luxometro').lean();
  },

  async porFolio(folio) {
    return Estudio.findOne({ folio });
  },

  async guardar(estudio) {
    return estudio.save();
  },
};

module.exports = { luxometroRepository, estudioRepository };



