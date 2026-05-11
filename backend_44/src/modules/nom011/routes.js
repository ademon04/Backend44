'use strict';

const express = require('express');
const router  = express.Router();

const { sonometroRepository, dosimetroRepository, estudioRepository } = require('./repository');
const nom011Service = require('./service');
const {
  validarCrearSonometro,
  validarCrearDosimetro,
  validarCrearEstudio,
  validarAgregarPuntosFijos,
  validarAgregarDosimetrias,
} = require('./middleware/validator');

// ============================================================================
// SONÓMETROS INTEGRADORES
// ============================================================================

router.post('/sonometros', validarCrearSonometro, async (req, res, next) => {
  try {
    const existe = await sonometroRepository.porSerie(req.body.serie_id);
    if (existe) return res.status(409).json({ error: 'Ya existe un sonómetro con ese número de serie' });
    const sonometro = await sonometroRepository.crear(req.body);
    res.status(201).json({ ok: true, id: sonometro._id, serie_id: sonometro.serie_id, sonometro });
  } catch (err) { next(err); }
});

router.get('/sonometros', async (req, res, next) => {
  try {
    const sonometros = await sonometroRepository.listar();
    res.json({ ok: true, count: sonometros.length, sonometros });
  } catch (err) { next(err); }
});

router.get('/sonometros/activos', async (req, res, next) => {
  try {
    const sonometros = await sonometroRepository.listarActivos();
    res.json({ ok: true, count: sonometros.length, sonometros });
  } catch (err) { next(err); }
});

router.get('/sonometros/vencimiento/proximo', async (req, res, next) => {
  try {
    const dias       = parseInt(req.query.dias) || 30;
    const sonometros = await sonometroRepository.porVencer(dias);
    res.json({ ok: true, count: sonometros.length, dias_ventana: dias, sonometros });
  } catch (err) { next(err); }
});

router.get('/sonometros/serie/:serie_id', async (req, res, next) => {
  try {
    const sonometro = await sonometroRepository.porSerie(req.params.serie_id);
    if (!sonometro) return res.status(404).json({ error: 'Sonómetro no encontrado' });
    res.json({ ok: true, sonometro });
  } catch (err) { next(err); }
});

router.get('/sonometros/:id', async (req, res, next) => {
  try {
    const sonometro = await sonometroRepository.porId(req.params.id);
    if (!sonometro) return res.status(404).json({ error: 'Sonómetro no encontrado' });
    res.json({ ok: true, sonometro });
  } catch (err) { next(err); }
});

router.put('/sonometros/:id', async (req, res, next) => {
  try {
    const sonometro = await sonometroRepository.actualizar(req.params.id, req.body);
    if (!sonometro) return res.status(404).json({ error: 'Sonómetro no encontrado' });
    res.json({ ok: true, sonometro });
  } catch (err) { next(err); }
});

router.delete('/sonometros/:id', async (req, res, next) => {
  try {
    const sonometro = await sonometroRepository.eliminar(req.params.id);
    if (!sonometro) return res.status(404).json({ error: 'Sonómetro no encontrado' });
    res.json({ ok: true, message: 'Sonómetro eliminado', id: req.params.id });
  } catch (err) { next(err); }
});

// ============================================================================
// DOSÍMETROS
// ============================================================================

router.post('/dosimetros', validarCrearDosimetro, async (req, res, next) => {
  try {
    const existe = await dosimetroRepository.porSerie(req.body.serie_id);
    if (existe) return res.status(409).json({ error: 'Ya existe un dosímetro con ese número de serie' });
    const dosimetro = await dosimetroRepository.crear(req.body);
    res.status(201).json({ ok: true, id: dosimetro._id, serie_id: dosimetro.serie_id, dosimetro });
  } catch (err) { next(err); }
});

router.get('/dosimetros', async (req, res, next) => {
  try {
    const dosimetros = await dosimetroRepository.listar();
    res.json({ ok: true, count: dosimetros.length, dosimetros });
  } catch (err) { next(err); }
});

router.get('/dosimetros/activos', async (req, res, next) => {
  try {
    const dosimetros = await dosimetroRepository.listarActivos();
    res.json({ ok: true, count: dosimetros.length, dosimetros });
  } catch (err) { next(err); }
});

router.get('/dosimetros/serie/:serie_id', async (req, res, next) => {
  try {
    const dosimetro = await dosimetroRepository.porSerie(req.params.serie_id);
    if (!dosimetro) return res.status(404).json({ error: 'Dosímetro no encontrado' });
    res.json({ ok: true, dosimetro });
  } catch (err) { next(err); }
});

router.get('/dosimetros/:id', async (req, res, next) => {
  try {
    const dosimetro = await dosimetroRepository.porId(req.params.id);
    if (!dosimetro) return res.status(404).json({ error: 'Dosímetro no encontrado' });
    res.json({ ok: true, dosimetro });
  } catch (err) { next(err); }
});

router.put('/dosimetros/:id', async (req, res, next) => {
  try {
    const dosimetro = await dosimetroRepository.actualizar(req.params.id, req.body);
    if (!dosimetro) return res.status(404).json({ error: 'Dosímetro no encontrado' });
    res.json({ ok: true, dosimetro });
  } catch (err) { next(err); }
});

router.delete('/dosimetros/:id', async (req, res, next) => {
  try {
    const dosimetro = await dosimetroRepository.eliminar(req.params.id);
    if (!dosimetro) return res.status(404).json({ error: 'Dosímetro no encontrado' });
    res.json({ ok: true, message: 'Dosímetro eliminado', id: req.params.id });
  } catch (err) { next(err); }
});

// ============================================================================
// ESTUDIOS
// ============================================================================

router.post('/estudios', validarCrearEstudio, async (req, res, next) => {
  try {
    const { numero_informe, orden_servicio, empresa, sonometro_id } = req.body;

    const existe = await estudioRepository.porNumeroInforme(numero_informe);
    if (existe) return res.status(409).json({ error: 'El número de informe ya existe' });

    const estudio = await estudioRepository.crear({
      numero_informe,
      orden_servicio,
      empresa,
      sonometro:  sonometro_id,
      estado:     'reconocimiento',
      historial_estados: [{
        estado:      'reconocimiento',
        usuario:     req.usuario?.nombre || 'sistema',
        observacion: 'Estudio creado',
      }],
    });

    res.status(201).json({ ok: true, id: estudio._id, numero_informe: estudio.numero_informe, estado: estudio.estado });
  } catch (err) { next(err); }
});

router.get('/estudios', async (req, res, next) => {
  try {
    const { docs, total } = await estudioRepository.listar(req.query);
    res.json({ total, limit: Number(req.query.limit) || 20, skip: Number(req.query.skip) || 0, datos: docs });
  } catch (err) { next(err); }
});

router.get('/estudios/:id', async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });
    res.json(estudio);
  } catch (err) { next(err); }
});

// ============================================================================
// PUNTOS FIJOS
// ============================================================================

router.post('/estudios/:id/puntos-fijos', validarAgregarPuntosFijos, async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    for (const punto of req.body.puntos_fijos) {
      const procesado = nom011Service.procesarPuntoFijo(punto);
      estudio.puntos_fijos.push(procesado);
    }

    await estudioRepository.guardar(estudio);
    res.json({ ok: true, puntos_agregados: req.body.puntos_fijos.length, total_puntos_fijos: estudio.puntos_fijos.length });
  } catch (err) { next(err); }
});

// ============================================================================
// DOSIMETRÍAS
// ============================================================================

router.post('/estudios/:id/dosimetrias', validarAgregarDosimetrias, async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    for (const dosis of req.body.dosimetrias) {
      const procesada = nom011Service.procesarDosimetria(dosis);
      estudio.dosimetrias.push(procesada);
    }

    await estudioRepository.guardar(estudio);
    res.json({ ok: true, dosimetrias_agregadas: req.body.dosimetrias.length, total_dosimetrias: estudio.dosimetrias.length });
  } catch (err) { next(err); }
});

// ============================================================================
// CALCULAR
// ============================================================================

router.post('/estudios/:id/calcular', async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    // Reprocesar puntos fijos
    for (let i = 0; i < estudio.puntos_fijos.length; i++) {
      const procesado = nom011Service.procesarPuntoFijo(estudio.puntos_fijos[i].toObject());
      estudio.puntos_fijos[i].nscea_t_promedio = procesado.nscea_t_promedio;
      estudio.puntos_fijos[i].ner              = procesado.ner;
      estudio.puntos_fijos[i].lmpe             = procesado.lmpe;
      estudio.puntos_fijos[i].tmpe             = procesado.tmpe;
      estudio.puntos_fijos[i].cumple           = procesado.cumple;
    }

    // Reprocesar dosimetrías
    for (let i = 0; i < estudio.dosimetrias.length; i++) {
      const procesada = nom011Service.procesarDosimetria(estudio.dosimetrias[i].toObject());
      estudio.dosimetrias[i].ner    = procesada.ner;
      estudio.dosimetrias[i].lmpe   = procesada.lmpe;
      estudio.dosimetrias[i].tmpe   = procesada.tmpe;
      estudio.dosimetrias[i].cumple = procesada.cumple;
    }

    // Calcular resultados globales
    const resultadosGlobal = nom011Service.calcularResultadosGlobales(
      estudio.puntos_fijos.map(p => p.toObject()),
      estudio.dosimetrias.map(d => d.toObject())
    );

    estudio.resultados = {
      ...estudio.resultados?.toObject?.() || estudio.resultados,
      ...resultadosGlobal,
    };

    estudio.estado = 'calculado';
    estudio.historial_estados.push({
      estado:      'calculado',
      usuario:     req.usuario?.nombre || 'sistema',
      observacion: 'Cálculo completado',
    });

    await estudioRepository.guardar(estudio);

    res.json({
      ok:           true,
      estado:       estudio.estado,
      resultados:   estudio.resultados,
      puntos_fijos: estudio.puntos_fijos,
      dosimetrias:  estudio.dosimetrias,
    });
  } catch (err) { next(err); }
});

module.exports = router;