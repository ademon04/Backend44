'use strict';

const express = require('express');
const router = express.Router();
const { luxometroRepository, estudioRepository } = require('./repository');
const nom025Service = require('./service');
const reportService = require('../../services/report.service');
const { validarCrearLuxometro, validarCrearEstudio, validarAgregarArea, validarAgregarPuntos, validarVerificacion } = require('./middleware/validator');
const { error } = require('winston');

// ============================================================================
// LUXÓMETROS
// ============================================================================


router.post('/luxometros', validarCrearLuxometro, async (req, res, next) => {
  try {
    const luxometro = await luxometroRepository.crear(req.body);
    res.status(201).json({ ok: true, id: luxometro._id, serie_id: luxometro.serie_id, luxometro });
  } catch (err) {
    next(err);
  }
});

router.get('/luxometros', async (req, res, next) => {
  try {
    const luxometros = await luxometroRepository.listar();
    res.json({ ok: true, luxometros });
  } catch (err) {
    next(err);
  }
});

router.get('/luxometros/activos', async (req, res, next) => {
  try {
    const luxometros = await luxometroRepository.listarActivos();
    res.json({ ok: true, count: luxometros.length, luxometros });
  } catch (err) {
    next(err);
  }
});

router.get('/luxometros/buscar/query', async (req, res, next) => {
  try {
    const luxometros = await luxometroRepository.buscar(req.query);
    res.json({ ok: true, count: luxometros.length, luxometros });
  } catch (err) {
    next(err);
  }
});

router.get('/luxometros/vencimiento/proximo', async (req, res, next) => {
  try {
    const dias = parseInt(req.query.dias) || 30;
    const luxometros = await luxometroRepository.porVencer(dias);
    res.json({ ok: true, count: luxometros.length, dias_ventana: dias, luxometros });
  } catch (err) {
    next(err);
  }
});

router.get('/luxometros/marca/:marca', async (req, res, next) => {
  try {
    const luxometros = await luxometroRepository.porMarca(req.params.marca);
    res.json({ ok: true, count: luxometros.length, luxometros });
  } catch (err) {
    next(err);
  }
});

router.get('/luxometros/serie/:serie_id', async (req, res, next) => {
  try {
    const luxometro = await luxometroRepository.porSerie(req.params.serie_id);
    if (!luxometro) return res.status(404).json({ ok: false, error: 'Luxómetro no encontrado' });
    res.json({ ok: true, luxometro });
  } catch (err) {
    next(err);
  }
});

router.get('/luxometros/:id', async (req, res, next) => {
  try {
    const luxometro = await luxometroRepository.porId(req.params.id);
    if (!luxometro) return res.status(404).json({ ok: false, error: 'Luxómetro no encontrado' });
    res.json({ ok: true, luxometro });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// ESTUDIOS
// ============================================================================

router.post('/estudios', validarCrearEstudio, async (req, res, next) => {
  try {
    const { folio, orden_servicio, empresa, luxometro_id } = req.body;

    const existe = await estudioRepository.porFolio(folio);
    if (existe) return res.status(409).json({ error: 'El folio ya existe' });

    const estudio = await estudioRepository.crear({
      folio,
      orden_servicio,
      empresa,
      luxometro: luxometro_id,
      estado: 'reconocimiento',
      historial_estados: [{
        estado:'reconocimiento',
        usuario:req.usuario?.nombre || 'sistema',
        observacion: 'Estudio creado',
      }],
    });

    res.status(201).json({ ok: true, id: estudio._id, folio: estudio.folio, estado: estudio.estado });
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

router.get('/estudios/:id/pdf', async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porIdLean(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    const pdf = await reportService.generate('nom025', estudio);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="informe_${estudio.folio}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    res.send(pdf);
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
// ÁREAS
// ============================================================================

router.post('/estudios/:id/areas', validarAgregarArea, async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    const area          = req.body;
    area.indice_area    = nom025Service.calcularIndiceArea(area.dimension_largo, area.dimension_ancho, area.altura_montaje);
    area.puntos_minimos = nom025Service.calcularPuntosMinimos(area.indice_area);

    estudio.areas.push(area);
    await estudioRepository.guardar(estudio);

    res.json({ ok: true, area: estudio.areas[estudio.areas.length - 1] });
  } catch (err) {
    next(err);
  }
});
router.get('/estudios/:id/areas', async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });
    res.json({ ok: true, count: estudio.areas.length, areas: estudio.areas });
  } catch (err) {
    next(err);
  }
});
// ============================================================================
// PUNTOS
// ============================================================================

router.post('/estudios/:id/puntos', validarAgregarPuntos, async (req, res, next) => {
  try {
    const { puntos, area_id } = req.body;
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    const area = estudio.areas.id(area_id);
    if (!area)  return res.status(404).json({ error: 'Área no encontrada' });

    const factoresCorreccion = estudio.luxometro?.factores_correccion || nom025Service.getFactoresCorreccionDefault();

    for (const punto of puntos) {
      const puntoProcesado = nom025Service.procesarPunto(punto, area.nmi_requerido, factoresCorreccion);
      estudio.puntos.push({ ...puntoProcesado, area_id });
    }

    await estudioRepository.guardar(estudio);
    res.json({ ok: true, puntos_agregados: puntos.length, total_puntos: estudio.puntos.length });
  } catch (err) {
    next(err);
  }
});

router.get('/estudios/:id/puntos', async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    // Filtro opcional por area_id ?area_id=xxx
    const { area_id } = req.query;
    const puntos = area_id
      ? estudio.puntos.filter(p => p.area_id?.toString() === area_id)
      : estudio.puntos;

    res.json({
      ok:           true,
      total_puntos: puntos.length,
      puntos,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// VERIFICACIÓN
// ============================================================================

router.post('/estudios/:id/verificacion', validarVerificacion, async (req, res, next) => {
  try {
    const { lectura_inicial, lectura_final, verificado_por, condiciones } = req.body;
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    const verificacion = nom025Service.verificarCriterioLuxometro(lectura_inicial, lectura_final);

    estudio.verificacion_equipo = {
      fecha:           new Date(),
      verificado_por,
      lectura_inicial,
      lectura_final,
      condiciones,
      cumple_criterio: verificacion?.cumple || false,
    };

    await estudioRepository.guardar(estudio);
    res.json({ ok: true, verificacion: estudio.verificacion_equipo, detalles: verificacion });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// CÁLCULO
// ============================================================================

router.post('/estudios/:id/calcular', async (req, res, next) => {
  try {
    const estudio = await estudioRepository.porId(req.params.id);
    if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });

    const factoresCorreccion = estudio.luxometro?.factores_correccion || nom025Service.getFactoresCorreccionDefault();

    for (let i = 0; i < estudio.puntos.length; i++) {
      const punto   = estudio.puntos[i];
      const area    = estudio.areas.id(punto.area_id);
      if (!area) continue;

      const procesado = nom025Service.procesarPunto(punto.toObject(), area.nmi_requerido, factoresCorreccion);

      estudio.puntos[i].lecturas = procesado.lecturas;
      estudio.puntos[i].promedio_lux_corregido = procesado.promedio_lux_corregido;
      estudio.puntos[i].promedio_kf_plano = procesado.promedio_kf_plano;
      estudio.puntos[i].promedio_kf_pared = procesado.promedio_kf_pared;
      estudio.puntos[i].ue_max = procesado.ue_max;
      estudio.puntos[i].cumple_lux = procesado.cumple_lux;
      estudio.puntos[i].cumple_plano = procesado.cumple_plano;
      estudio.puntos[i].cumple_pared = procesado.cumple_pared;
      estudio.puntos[i].cumple_total = procesado.cumple_total;
    }

    const puntosPorArea = new Map();
    for (const punto of estudio.puntos) {
      const areaId = punto.area_id?.toString();
      if (areaId) {
        if (!puntosPorArea.has(areaId)) puntosPorArea.set(areaId, []);
        puntosPorArea.get(areaId).push(punto);
      }
    }

    const areasProcesadas = [];
    for (let i = 0; i < estudio.areas.length; i++) {
      const area = estudio.areas[i];
      const puntos = puntosPorArea.get(area._id.toString()) || [];
      const areaProcesada = nom025Service.procesarArea(area, puntos);
      areasProcesadas.push(areaProcesada);

      estudio.areas[i].promedio_lux = areaProcesada.promedio_lux;
      estudio.areas[i].cumple_lux = areaProcesada.cumple_lux;
      estudio.areas[i].cumple_reflexion = areaProcesada.cumple_reflexion;
      estudio.areas[i].cumple_total = areaProcesada.cumple_total;
    }

    const todosLosPuntos   = estudio.puntos.map(p => p.toObject());
    const resultadosGlobal = nom025Service.calcularResultadosGlobales(areasProcesadas, todosLosPuntos);

    estudio.resultados = {
      ...estudio.resultados?.toObject?.() || estudio.resultados,
      total_puntos_medidos:    resultadosGlobal.total_puntos_medidos,
      total_puntos_cumplen:    resultadosGlobal.total_puntos_cumplen,
      porcentaje_cumplimiento: resultadosGlobal.porcentaje_cumplimiento,
      conclusion_general:      resultadosGlobal.conclusion_general,
      puntos_fallidos:         resultadosGlobal.puntos_fallidos,
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
      areas:     areasProcesadas,
      resultados: estudio.resultados,
      resumen: {
        total_puntos:            resultadosGlobal.total_puntos_medidos,
        puntos_cumplen:          resultadosGlobal.total_puntos_cumplen,
        puntos_fallidos:         resultadosGlobal.puntos_fallidos,
        porcentaje_cumplimiento: resultadosGlobal.porcentaje_cumplimiento,
        conclusion:              resultadosGlobal.conclusion_general,
        regla_decision:          estudio.resultados.regla_decision,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;