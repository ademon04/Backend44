'use strict';

const express                                          = require('express');
const router                                           = express.Router();
const { sonometroRepository, estudioRepository }       = require('./repository');
const nom081Service                                    = require('./service');
const { validarCrearSonometro, validarCalcular, validarCrearEstudio } = require('./middleware/validator');

// ============================================================================
// SONÓMETRO
// ============================================================================

router.post('/sonometros', validarCrearSonometro, async (req, res, next) => {
  try {
    const sonometro = await sonometroRepository.crear(req.body);
    res.status(201).json({ ok: true, id: sonometro._id, serie_id: sonometro.serie_id, sonometro });
  } catch (err) {
    next(err);
  }
});

router.get('/sonometros', async (req, res, next) => {
  try {
    const sonometros = await sonometroRepository.listar(req.query);
    res.json({ ok: true, count: sonometros.length, sonometros });
  } catch (err) {
    next(err);
  }
});

router.get('/sonometros/activos', async (req, res, next) => {
  try {
    const sonometros = await sonometroRepository.listarActivos();
    res.json({ ok: true, count: sonometros.length, sonometros });
  } catch (err) {
    next(err);
  }
});

router.get('/sonometros/buscar/query', async (req, res, next) => {
  try {
    const sonometros = await sonometroRepository.buscar(req.query);
    res.json({ ok: true, count: sonometros.length, sonometros });
  } catch (err) {
    next(err);
  }
});

router.get('/sonometros/vencimiento/proximo', async (req, res, next) => {
  try {
    const dias       = parseInt(req.query.dias) || 30;
    const sonometros = await sonometroRepository.porVencer(dias);
    res.json({ ok: true, count: sonometros.length, dias_ventana: dias, sonometros });
  } catch (err) {
    next(err);
  }
});

router.get('/sonometros/serie/:serie_id', async (req, res, next) => {
  try {
    const sonometro = await sonometroRepository.porSerie(req.params.serie_id);
    if (!sonometro) return res.status(404).json({ ok: false, error: 'Sonómetro no encontrado' });
    res.json({ ok: true, sonometro });
  } catch (err) {
    next(err);
  }
});

router.get('/sonometros/:id', async (req, res, next) => {
  try {
    const sonometro = await sonometroRepository.porId(req.params.id);
    if (!sonometro) return res.status(404).json({ ok: false, error: 'Sonómetro no encontrado' });
    res.json({ ok: true, sonometro });
  } catch (err) {
    next(err);
  }
});

router.put('/sonometros/:id', async (req, res, next) => {
  try {
    const sonometro = await sonometroRepository.actualizar(req.params.id, req.body);
    if (!sonometro) return res.status(404).json({ ok: false, error: 'Sonómetro no encontrado' });
    res.json({ ok: true, sonometro });
  } catch (err) {
    next(err);
  }
});

router.delete('/sonometros/:id', async (req, res, next) => {
  try {
    const sonometro = await sonometroRepository.eliminar(req.params.id);
    if (!sonometro) return res.status(404).json({ ok: false, error: 'Sonómetro no encontrado' });
    res.json({ ok: true, message: 'Sonómetro eliminado', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// ESTUDIOS
// ============================================================================

router.post('/calcular', validarCalcular, (req, res, next) => {
  try {
    const resultados = nom081Service.calcularMuestreoNOM081(req.body);
    res.json(resultados);
  } catch (err) {
    next(err);
  }
});

router.post('/estudios', validarCrearEstudio, async (req, res, next) => {
  try {
    const datos      = req.body;
    const resultados = nom081Service.calcularMuestreoNOM081(datos);

    const estudio = await estudioRepository.crear({
      numero_informe:         datos.numero_informe,
      orden_servicio:         datos.orden_servicio,
      fecha_medicion:         datos.fecha_medicion,
      fecha_recepcion:        datos.fecha_recepcion,
      fecha_emision:          datos.fecha_emision,
      empresa:                datos.empresa,
      sonometro:              datos.sonometro_id,
      zona_tipo:              datos.zona_tipo,
      condiciones_ambientales:datos.condiciones_ambientales || {},
      equipos_medicion:       datos.equipos_medicion || {},
      mediciones:             datos.mediciones,
      resultados: {
        diurno:   resultados.diurno,
        nocturno: resultados.nocturno,
      },
      conclusion:           resultados.conclusion,
      responsable_estudio:  datos.responsable_estudio,
      ingeniero_servicio:   datos.ingeniero_servicio,
      verificador:          datos.verificador,
      observaciones:        datos.observaciones,
    });

    res.status(201).json({ ok: true, id: estudio._id, numero_informe: estudio.numero_informe, resultados });
  } catch (err) {
    next(err);
  }
});

router.get('/estudios', async (req, res, next) => {
  try {
    const estudios = await estudioRepository.listar(req.query);
    res.json({ ok: true, count: estudios.length, estudios });
  } catch (err) {
    next(err);
  }
});

router.get('/estudios/informe/:numero', async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porNumeroInforme(req.params.numero);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });
    res.json({ ok: true, estudio });
  } catch (err) {
    next(err);
  }
});

router.get('/estudios/:id', async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });
    res.json({ ok: true, estudio });
  } catch (err) {
    next(err);
  }
});

router.put('/estudios/:id/recalcular', async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    const nuevosResultados = nom081Service.calcularMuestreoNOM081({
      zona_tipo:   estudio.zona_tipo,
      mediciones:  estudio.mediciones,
    });

    const actualizado = await estudioRepository.actualizar(estudio._id, {
      resultados: {
        diurno:   nuevosResultados.diurno,
        nocturno: nuevosResultados.nocturno,
      },
      conclusion: nuevosResultados.conclusion,
    });

    res.json({ ok: true, id: actualizado._id, resultados: nuevosResultados });
  } catch (err) {
    next(err);
  }
});

router.delete('/estudios/:id', async (req, res, next) => {
  try {
    const estudio = await estudioRepository.eliminar(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });
    res.json({ ok: true, message: 'Estudio eliminado', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;