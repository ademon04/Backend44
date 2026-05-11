'use strict';

const express = require('express');
const router = express.Router();
const { terrometroRepository, multimetroRepository, estudioRepository } = require('./repository');
const nom022Service = require('./service');
const { validarCrearTerrometro, validarCrearMultimetro, validarCrearEstudio, validarAgregarPozos, validarAgregarContinuidades, validarVerificacion } = require('./middleware/validator');

// ============================================================================
// TERRÓMETROS
// ============================================================================

router.post('/terrometros', validarCrearTerrometro, async (req, res, next) => {
  try {
    const terrometro = await terrometroRepository.crear(req.body);
    res.status(201).json({ ok: true, id: terrometro._id, serie_id: terrometro.serie_id, terrometro });
  } catch (err) {
    next(err);
  }
});

router.get('/terrometros', async (req, res, next) => {
  try {
    const terrometros = await terrometroRepository.listar();
    res.json({ ok: true, count: terrometros.length, terrometros });
  } catch (err) {
    next(err);
  }
});

router.get('/terrometros/activos', async (req, res, next) => {
  try {
    const terrometros = await terrometroRepository.listarActivos();
    res.json({ ok: true, count: terrometros.length, terrometros });
  } catch (err) {
    next(err);
  }
});

router.get('/terrometros/buscar/query', async (req, res, next) => {
  try {
    const terrometros = await terrometroRepository.buscar(req.query);
    res.json({ ok: true, count: terrometros.length, terrometros });
  } catch (err) {
    next(err);
  }
});

router.get('/terrometros/vencimiento/proximo', async (req, res, next) => {
  try {
    const dias        = parseInt(req.query.dias) || 30;
    const terrometros = await terrometroRepository.porVencer(dias);
    res.json({ ok: true, count: terrometros.length, dias_ventana: dias, terrometros });
  } catch (err) {
    next(err);
  }
});

router.get('/terrometros/serie/:serie_id', async (req, res, next) => {
  try {
    const terrometro = await terrometroRepository.porSerie(req.params.serie_id);
    if (!terrometro) return res.status(404).json({ error: 'Terrómetro no encontrado' });
    res.json({ ok: true, terrometro });
  } catch (err) {
    next(err);
  }
});

router.get('/terrometros/:id', async (req, res, next) => {
  try {
    const terrometro = await terrometroRepository.porId(req.params.id);
    if (!terrometro) return res.status(404).json({ error: 'Terrómetro no encontrado' });
    res.json({ ok: true, terrometro });
  } catch (err) {
    next(err);
  }
});

router.put('/terrometros/:id', async (req, res, next) => {
  try {
    const terrometro = await terrometroRepository.actualizar(req.params.id, req.body);
    if (!terrometro) return res.status(404).json({ error: 'Terrómetro no encontrado' });
    res.json({ ok: true, terrometro });
  } catch (err) {
    next(err);
  }
});

router.delete('/terrometros/:id', async (req, res, next) => {
  try {
    const terrometro = await terrometroRepository.eliminar(req.params.id);
    if (!terrometro) return res.status(404).json({ error: 'Terrómetro no encontrado' });
    res.json({ ok: true, message: 'Terrómetro eliminado', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// MULTÍMETROS
// ============================================================================

router.post('/multimetros', validarCrearMultimetro, async (req, res, next) => {
  try {
    const multimetro = await multimetroRepository.crear(req.body);
    res.status(201).json({ ok: true, id: multimetro._id, serie_id: multimetro.serie_id, multimetro });
  } catch (err) {
    next(err);
  }
});

router.get('/multimetros', async (req, res, next) => {
  try {
    const multimetros = await multimetroRepository.listar();
    res.json({ ok: true, count: multimetros.length, multimetros });
  } catch (err) {
    next(err);
  }
});

router.get('/multimetros/activos', async (req, res, next) => {
  try {
    const multimetros = await multimetroRepository.listarActivos();
    res.json({ ok: true, count: multimetros.length, multimetros });
  } catch (err) {
    next(err);
  }
});

router.get('/multimetros/serie/:serie_id', async (req, res, next) => {
  try {
    const multimetro = await multimetroRepository.porSerie(req.params.serie_id);
    if (!multimetro) return res.status(404).json({ error: 'Multímetro no encontrado' });
    res.json({ ok: true, multimetro });
  } catch (err) {
    next(err);
  }
});

router.get('/multimetros/:id', async (req, res, next) => {
  try {
    const multimetro = await multimetroRepository.porId(req.params.id);
    if (!multimetro) return res.status(404).json({ error: 'Multímetro no encontrado' });
    res.json({ ok: true, multimetro });
  } catch (err) {
    next(err);
  }
});

router.put('/multimetros/:id', async (req, res, next) => {
  try {
    const multimetro = await multimetroRepository.actualizar(req.params.id, req.body);
    if (!multimetro) return res.status(404).json({ error: 'Multímetro no encontrado' });
    res.json({ ok: true, multimetro });
  } catch (err) {
    next(err);
  }
});

router.delete('/multimetros/:id', async (req, res, next) => {
  try {
    const multimetro = await multimetroRepository.eliminar(req.params.id);
    if (!multimetro) return res.status(404).json({ error: 'Multímetro no encontrado' });
    res.json({ ok: true, message: 'Multímetro eliminado', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// ESTUDIOS
// ============================================================================

router.post('/estudios', validarCrearEstudio, async (req, res, next) => {
  try {
    const { numero_informe, orden_servicio, empresa, terrometro_id, multimetro_id } = req.body;

    const existe = await estudioRepository.porNumeroInforme(numero_informe);
    if (existe) return res.status(409).json({ error: 'El número de informe ya existe' });

    const estudio = await estudioRepository.crear({
      numero_informe,
      orden_servicio,
      empresa,
      terrometro: terrometro_id,
      multimetro: multimetro_id,
      estado: 'reconocimiento',
      historial_estados: [{
        estado:      'reconocimiento',
        usuario:     req.usuario?.nombre || 'sistema',
        observacion: 'Estudio creado',
      }],
    });

    res.status(201).json({ ok: true, id: estudio._id, numero_informe: estudio.numero_informe, estado: estudio.estado });
  } catch (err) {
    next(err);
  }
});

router.get('/estudios', async (req, res, next) => {
  try {
    const { docs, total } = await estudioRepository.listar(req.query);
    res.json({ total, limit: Number(req.query.limit) || 20, skip: Number(req.query.skip) || 0, datos: docs });
  } catch (err) {
    next(err);
  }
});

router.get('/estudios/:id', async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });
    res.json(estudio);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// POZOS
// ============================================================================

router.post('/estudios/:id/pozos', validarAgregarPozos, async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    for (const pozo of req.body.pozos) {
      const pozoProcesado = nom022Service.procesarPozo(pozo);
      estudio.pozos.push(pozoProcesado);
    }

    await estudioRepository.guardar(estudio);
    res.json({ ok: true, pozos_agregados: req.body.pozos.length, total_pozos: estudio.pozos.length });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// CONTINUIDADES
// ============================================================================

router.post('/estudios/:id/continuidades', validarAgregarContinuidades, async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    for (const cont of req.body.continuidades) {
      const contProcesada = nom022Service.procesarContinuidad(cont);
      estudio.continuidades.push(contProcesada);
    }

    await estudioRepository.guardar(estudio);
    res.json({ ok: true, continuidades_agregadas: req.body.continuidades.length, total_continuidades: estudio.continuidades.length });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// VERIFICACIÓN
// ============================================================================

router.post('/estudios/:id/verificacion', validarVerificacion, async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    const resultado = nom022Service.verificarCriterioTerrometro(req.body);

    estudio.verificacion_equipo = {
      ...req.body,
      cumple_criterio: resultado.cumple_criterio,
    };

    await estudioRepository.guardar(estudio);
    res.json({ ok: true, verificacion: estudio.verificacion_equipo, detalles: resultado });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// CALCULAR
// ============================================================================

router.post('/estudios/:id/calcular', async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    // Reprocesar todos los pozos
    for (let i = 0; i < estudio.pozos.length; i++) {
      const procesado = nom022Service.procesarPozo(estudio.pozos[i].toObject());
      estudio.pozos[i].resultado_ohm = procesado.resultado_ohm;
      estudio.pozos[i].limite_ohm    = procesado.limite_ohm;
      estudio.pozos[i].ue_ohm        = procesado.ue_ohm;
      estudio.pozos[i].cumple        = procesado.cumple;
    }

    // Reprocesar continuidades
    for (let i = 0; i < estudio.continuidades.length; i++) {
      const procesada = nom022Service.procesarContinuidad(estudio.continuidades[i].toObject());
      estudio.continuidades[i].tiene_continuidad = procesada.tiene_continuidad;
    }

    // Calcular resultados globales
    const resultadosGlobal = nom022Service.calcularResultadosGlobales(
      estudio.pozos.map(p => p.toObject()),
      estudio.continuidades.map(c => c.toObject())
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
      ok:        true,
      estado:    estudio.estado,
      resultados: estudio.resultados,
      pozos:     estudio.pozos,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;