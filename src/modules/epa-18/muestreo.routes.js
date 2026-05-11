// routes/muestreo.routes.js
// Alineado con muestreo.model.js (FC-AAR-004 Rev.23) y calculo-epa18.js
// CON SISTEMA DE ESTADOS: borrador → campo_completo → en_laboratorio → laboratorio_listo → calculado → validado
'use strict';

const express  = require('express');
const router   = express.Router();
const Muestreo = require('./muestreo.models');
const { calcularMuestreo, calcularDistanciasPuntos } = require('./calculo-epa18.service');

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

// ==================== VALIDACIÓN DE ANALITOS ====================
const ANALITOS_VALIDOS = [
  'Benceno', 'Tolueno', 'Clorobenceno', 'EtilBenceno',
  'o-Xileno', 'm,p-Xileno', '1,3-Diclorobenceno',
  '1,4-Diclorobenceno', '1,2-Diclorobenceno'
];

function validarAnalitos(masas) {
  const errores = [];
  
  if (!Array.isArray(masas) || masas.length === 0) {
    return ['masas_laboratorio es requerido y debe ser un array no vacío'];
  }
  
  const nombres = masas.map(m => m.nombre);
  const duplicados = nombres.filter((n, i) => nombres.indexOf(n) !== i);
  if (duplicados.length) {
    errores.push(`Analitos duplicados: ${[...new Set(duplicados)].join(', ')}`);
  }
  
  const invalidos = masas.filter(m => !ANALITOS_VALIDOS.includes(m.nombre));
  if (invalidos.length) {
    errores.push(`Analitos no válidos: ${invalidos.map(i => i.nombre).join(', ')}`);
  }
  
  const negativos = masas.filter(m => m.masa_mg < 0);
  if (negativos.length) {
    errores.push(`Masas negativas: ${negativos.map(n => n.nombre).join(', ')}`);
  }
  
  return errores;
}

// ==================== VALIDACIÓN DE CAMPOS POR ESTADO ====================
// Campos requeridos para cada estado
const CAMPOS_POR_ESTADO = {
  borrador: ['codigo_muestra', 'orden_servicio'],
  campo_completo: [
    'codigo_muestra', 'orden_servicio',
    'empresa.altitud_msnm',
    'chimenea.forma_geometrica',
    'medicion_campo.presion_estatica_inH2O',
    'medicion_campo.temperatura_chimenea_C',
    'medicion_campo.tiempo_muestreo_min',
    'bomba.flujo_inicial_Lmin',
    'bomba.flujo_final_Lmin',
    'bomba.factor_calibracion_fcg',
    'composicion_gases.O2_pct',
    'composicion_gases.CO_ppm',
    'composicion_gases.CO2_pct',
    'determinacion_humedad.impactores'
  ],
  en_laboratorio: [],  // mismos que campo_completo (sin masas aún)
  laboratorio_listo: ['masas_laboratorio'],  // ya tiene masas
  calculado: [],  // ya tiene resultados
  validado: []    // ya tiene todo
};

function validarCamposPorEstado(body, estado) {
  const camposRequeridos = CAMPOS_POR_ESTADO[estado] || CAMPOS_POR_ESTADO.borrador;
  const faltantes = [];
  
  for (const campo of camposRequeridos) {
    const valor = campo.split('.').reduce((obj, key) => obj?.[key], body);
    if (valor === undefined || valor === null || valor === '') {
      faltantes.push(campo);
    }
  }
  
  return faltantes;
}

// Función para agregar al historial de estados
async function agregarAlHistorial(doc, nuevoEstado, usuario = null, observacion = null) {
  doc.historial_estados = doc.historial_estados || [];
  doc.historial_estados.push({
    estado: nuevoEstado,
    fecha: new Date(),
    usuario: usuario || 'sistema',
    observacion: observacion || `Cambio de estado a ${nuevoEstado}`
  });
  doc.estado = nuevoEstado;
  await doc.save();
}

/** Normaliza el código de muestra para URLs */
function normalizarCodigo(codigo) {
  return codigo.replace(/-(?=\d{6})/, '/');
}

function mapearResultados(r) {
  return {
    presion_barometrica_inHg:      r.presion_barometrica_inHg,
    presion_barometrica_mmHg:      r.presion_barometrica_mmHg,
    presion_conducto_inHg:         r.presion_conducto_inHg,
    area_chimenea_m2:              r.area_chimenea_m2,
    presion_absoluta_mmHg:         r.presion_absoluta_mmHg,
    fraccion_humedad_bws:          r.fraccion_humedad_bws,
    ptac_g:                        r.ptac_g,
    N2_pct:                        r.N2_pct,
    peso_molecular_humedo_g_gmol:  r.peso_molecular_humedo_g_gmol,
    dp_promedio_inH2O:             r.dp_promedio_inH2O,
    volumen_muestreado_m3:         r.volumen_muestreado_m3,
    volumen_muestreado_COVs_L:     r.volumen_muestreado_COVs_L,
    flujo_bomba_promedio_Lmin:     r.flujo_bomba_promedio_Lmin,
    velocidad_gases_m_s:           r.velocidad_gases_m_s,
    flujo_vol_m3_h:                r.flujo_vol_m3_h,
    flujo_vol_ft3_min:             r.flujo_vol_ft3_min,
    concentracion_total_COV_mg_m3: r.concentracion_total_COV_mg_m3,
    c1_micropoise:                 r.c1_micropoise,
    analitos:                      r.analitos,
  };
}

function mapearBomba(body, r) {
  const bg = body.bomba ?? {};
  const extra = r._extra?.verificacion_bomba ?? {};
  return {
    serie_id:              bg.serie_id,
    marca:                 bg.marca,
    modelo:                bg.modelo,
    factor_calibracion_fcg: bg.factor_calibracion_fcg,
    flujo_inicial_Lmin:    bg.flujo_inicial_Lmin,
    flujo_final_Lmin:      bg.flujo_final_Lmin,
    flujo_promedio_Lmin:   r.flujo_bomba_promedio_Lmin,
    cumple_criterio_5pct:  extra.cumple_criterio_5pct,
    verificacion:          extra.verificacion ?? {},
  };
}

function mapearDeterminacionHumedad(body, r) {
  const dh = body.determinacion_humedad ?? {};
  const impactores = dh.impactores ?? body.impactores ?? [];
  const mc = body.medicion_campo ?? {};

  return {
    tiempo_muestreo_min:     mc.tiempo_muestreo_min ?? body.tiempo_min,
    volumen_muestreado_L:    r.volumen_muestreado_COVs_L,
    contenido_humedad_Fgh:   r.fraccion_humedad_bws,
    ptac_g:                  r.ptac_g,
    impactores: impactores.map(imp => ({
      numero:         imp.numero,
      descripcion:    imp.descripcion,
      peso_inicial_g: imp.peso_inicial_g,
      peso_final_g:   imp.peso_final_g,
      ganancia_g:     imp.ganancia_g ?? ((imp.peso_final_g ?? 0) - (imp.peso_inicial_g ?? 0)),
    })),
  };
}

function mapearEquipoCalibracion(body) {
  const ec = body.equipo_calibracion ?? {};
  return {
    tipo:               ec.tipo,
    marca:              ec.marca,
    modelo:             ec.modelo,
    serie_id:           ec.serie_id,
    factor_calibracion: ec.factor_calibracion ?? body.bomba?.factor_calibracion_fcg,
  };
}

function mapearCondicionesGenerales(r) {
  return {
    presion_barometrica_inHg: r.presion_barometrica_inHg,
    presion_conducto_inHg:    r.presion_conducto_inHg,
  };
}

function mapearGases(body, r) {
  const cg = body.composicion_gases ?? {};
  return {
    O2_pct:               cg.O2_pct,
    CO_ppm:               cg.CO_ppm,
    CO2_pct:              cg.CO2_pct,
    N2_pct:               r.N2_pct,
    temperatura_ambiente_C: cg.temperatura_ambiente_C,
    temperatura_chimenea_C: cg.temperatura_chimenea_C ?? body.medicion_campo?.temperatura_chimenea_C,
  };
}

function mapearMedicionCampo(body, r) {
  const mc   = body.medicion_campo ?? {};
  const ch   = body.chimenea ?? {};
  const puntosConDist = calcularDistanciasPuntos(
    mc.puntos ?? [], ch.diametro_m, ch.extension_puerto_m
  );
  return {
    puntos:                 puntosConDist,
    dp_promedio_inH2O:      r.dp_promedio_inH2O,
    presion_estatica_inH2O: mc.presion_estatica_inH2O,
    temperatura_chimenea_C: mc.temperatura_chimenea_C,
    tiempo_muestreo_min:    mc.tiempo_muestreo_min,
  };
}

function datosDesdeDoc(doc, overrides = {}) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    empresa:           d.empresa,
    chimenea:          d.chimenea,
    medicion_campo:    d.medicion_campo,
    determinacion_humedad: d.determinacion_humedad,
    bomba:             d.bomba,
    composicion_gases: d.composicion_gases,
    masas_laboratorio: d.masas_laboratorio,
    norma_limite:      d.norma_limite,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────
// POST /api/muestreos — crear nuevo muestreo (estado: borrador)
// ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const body = req.body;

    // Validación mínima (solo código y orden)
    const faltantes = validarCamposPorEstado(body, 'borrador');
    if (faltantes.length) {
      return res.status(400).json({ error: 'Campos requeridos para borrador faltantes', faltantes });
    }

    // Si ya trae estado, se usa, sino borrador por defecto
    const estadoInicial = body.estado || 'borrador';

    // Construir documento básico (sin calcular aún)
    const doc = new Muestreo({
      codigo_muestra:      body.codigo_muestra,
      orden_servicio:      body.orden_servicio,
      numero_hoja:         body.numero_hoja,
      total_hojas:         body.total_hojas,
      version_formato:     body.version_formato,
      identificacion_equipo: body.identificacion_equipo,
      estado: estadoInicial,
      empresa: body.empresa,
      observaciones: body.observaciones,
    });

    await doc.save();
    
    // Agregar al historial
    await agregarAlHistorial(doc, estadoInicial);

    res.status(201).json({
      ok: true,
      id: doc._id,
      codigo: doc.codigo_muestra,
      estado: doc.estado,
      mensaje: `Muestreo creado en estado: ${estadoInicial}`
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Código de muestra duplicado', codigo: req.body.codigo_muestra });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// PATCH /api/muestreos/:codigo — actualizar campos
// ─────────────────────────────────────────────────────────
router.patch('/:codigo', async (req, res) => {
  try {
    const codigo = normalizarCodigo(req.params.codigo);
    const doc = await Muestreo.findOne({ codigo_muestra: codigo });
    if (!doc) return res.status(404).json({ error: 'Muestreo no encontrado', codigo });

    const { codigo_muestra, ...campos } = req.body;

    // Validar analitos si se están actualizando
    if (campos.masas_laboratorio) {
      const erroresAnalitos = validarAnalitos(campos.masas_laboratorio);
      if (erroresAnalitos.length) {
        return res.status(400).json({ error: 'Validación de analitos falló', detalles: erroresAnalitos });
      }
    }

    const docActualizado = await Muestreo.findOneAndUpdate(
      { codigo_muestra: codigo },
      { $set: campos },
      { new: true, runValidators: true }
    );

    res.json({ ok: true, estado: docActualizado.estado, datos: docActualizado });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/muestreos/:codigo/campo — marcar como campo_completo y calcular
// ─────────────────────────────────────────────────────────
// POST /api/muestreos/:codigo/campo — marcar como campo_completo y calcular
router.post('/:codigo/campo', async (req, res) => {
  try {
    const codigo = normalizarCodigo(req.params.codigo);
    const doc = await Muestreo.findOne({ codigo_muestra: codigo });
    if (!doc) return res.status(404).json({ error: 'Muestreo no encontrado', codigo });

    // Validar que tenga los datos de campo mínimos (sin repetir los que ya tiene el doc)
    const camposRequeridosCampo = [
      'chimenea.forma_geometrica',
      'medicion_campo.presion_estatica_inH2O',
      'medicion_campo.temperatura_chimenea_C',
      'medicion_campo.tiempo_muestreo_min',
      'bomba.flujo_inicial_Lmin',
      'bomba.flujo_final_Lmin',
      'bomba.factor_calibracion_fcg',
      'composicion_gases.O2_pct',
      'composicion_gases.CO_ppm',
      'composicion_gases.CO2_pct',
      'determinacion_humedad.impactores'
    ];

    const faltantes = [];
    for (const campo of camposRequeridosCampo) {
      const valor = campo.split('.').reduce((obj, key) => obj?.[key], req.body);
      if (valor === undefined || valor === null || valor === '') {
        faltantes.push(campo);
      }
    }

    if (faltantes.length) {
      return res.status(400).json({ error: 'Datos de campo incompletos', faltantes });
    }

    // Actualizar con los datos de campo
    const { ...campos } = req.body;
    await Muestreo.findOneAndUpdate(
      { codigo_muestra: codigo },
      { $set: campos },
      { runValidators: true }
    );

    // Recalcular con datos de campo
    const docActualizado = await Muestreo.findOne({ codigo_muestra: codigo });
    const datos = datosDesdeDoc(docActualizado);
    const r = calcularMuestreo(datos);

    // Actualizar resultados y cambiar estado
    docActualizado.resultados = mapearResultados(r);
    docActualizado.condiciones_generales = mapearCondicionesGenerales(r);
    if (docActualizado.chimenea) {
      docActualizado.chimenea.deq_m = r._extra?.deq_m;
    }
    
    await agregarAlHistorial(docActualizado, 'campo_completo');

    res.json({
      ok: true,
      estado: docActualizado.estado,
      resultados: mapearResultados(r),
      validaciones: {
        humedad: r._extra?.validacion_humedad,
        epa18: r._extra?.validacion_epa18,
        bomba: r._extra?.verificacion_bomba,
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/muestreos/:codigo/laboratorio — agregar masas y pasar a laboratorio_listo
// ─────────────────────────────────────────────────────────
router.post('/:codigo/laboratorio', async (req, res) => {
  try {
    const codigo = normalizarCodigo(req.params.codigo);
    const doc = await Muestreo.findOne({ codigo_muestra: codigo });
    if (!doc) return res.status(404).json({ error: 'Muestreo no encontrado', codigo });

    const { masas_laboratorio, ...otros } = req.body;

    // Validar masas
    if (!masas_laboratorio || !masas_laboratorio.length) {
      return res.status(400).json({ error: 'Se requieren masas_laboratorio' });
    }
    
    const erroresAnalitos = validarAnalitos(masas_laboratorio);
    if (erroresAnalitos.length) {
      return res.status(400).json({ error: 'Validación de analitos falló', detalles: erroresAnalitos });
    }

    // Actualizar masas
    doc.masas_laboratorio = masas_laboratorio;
    
    // Actualizar otros campos si vienen
    if (Object.keys(otros).length) {
      Object.assign(doc, otros);
    }

    await agregarAlHistorial(doc, 'laboratorio_listo');

    res.json({
      ok: true,
      estado: doc.estado,
      masas_laboratorio: doc.masas_laboratorio,
      mensaje: 'Masas de laboratorio agregadas. Use /calcular para obtener resultados finales.'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/muestreos/:codigo/calcular — calcular resultados finales
// ─────────────────────────────────────────────────────────
router.post('/:codigo/calcular', async (req, res) => {
  try {
    const codigo = normalizarCodigo(req.params.codigo);
    const doc = await Muestreo.findOne({ codigo_muestra: codigo });
    if (!doc) return res.status(404).json({ error: 'Muestreo no encontrado', codigo });

    // Validar que tenga masas de laboratorio
    if (!doc.masas_laboratorio || !doc.masas_laboratorio.length) {
      return res.status(400).json({ 
        error: 'No se puede calcular sin masas de laboratorio',
        sugerencia: 'Use POST /laboratorio primero'
      });
    }

    const datos = datosDesdeDoc(doc);
    const r = calcularMuestreo(datos);

    // Actualizar resultados
    doc.resultados = mapearResultados(r);
    doc.condiciones_generales = mapearCondicionesGenerales(r);
    
    await agregarAlHistorial(doc, 'calculado');

    res.json({
      ok: true,
      estado: doc.estado,
      resultados: mapearResultados(r),
      validaciones: {
        humedad: r._extra?.validacion_humedad,
        epa18: r._extra?.validacion_epa18,
        bomba: r._extra?.verificacion_bomba,
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/muestreos/:codigo/validar — marcar como validado (final)
// ─────────────────────────────────────────────────────────
router.post('/:codigo/validar', async (req, res) => {
  try {
    const codigo = normalizarCodigo(req.params.codigo);
    const doc = await Muestreo.findOne({ codigo_muestra: codigo });
    if (!doc) return res.status(404).json({ error: 'Muestreo no encontrado', codigo });

    if (doc.estado !== 'calculado') {
      return res.status(400).json({ 
        error: `No se puede validar desde estado ${doc.estado}. Debe estar en 'calculado'`
      });
    }

    await agregarAlHistorial(doc, 'validado', req.body.usuario, req.body.observacion);

    res.json({
      ok: true,
      estado: doc.estado,
      mensaje: 'Muestreo validado y listo para informe final'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/muestreos — listar con filtros (incluyendo estado)
// ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { orden_servicio, empresa, estado, desde, hasta, limit = 20, skip = 0 } = req.query;

    const filtro = {};
    if (orden_servicio) filtro.orden_servicio = orden_servicio;
    if (empresa)        filtro['empresa.razon_social'] = new RegExp(empresa, 'i');
    if (estado)         filtro.estado = estado;
    if (desde || hasta) {
      filtro.fecha_muestreo = {};
      if (desde) filtro.fecha_muestreo.$gte = new Date(desde);
      if (hasta) filtro.fecha_muestreo.$lte = new Date(hasta);
    }

    const [docs, total] = await Promise.all([
      Muestreo.find(filtro)
        .select('-resultados.analitos -medicion_campo.puntos -determinacion_humedad.impactores')
        .sort({ fecha_muestreo: -1 })
        .limit(Number(limit))
        .skip(Number(skip))
        .lean(),
      Muestreo.countDocuments(filtro),
    ]);

    res.json({ total, limit: Number(limit), skip: Number(skip), datos: docs });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/muestreos/:codigo — obtener uno completo
// ─────────────────────────────────────────────────────────
router.get('/:codigo', async (req, res) => {
  try {
    const codigo = normalizarCodigo(req.params.codigo);
    const doc    = await Muestreo.findOne({ codigo_muestra: codigo }).lean();
    if (!doc) return res.status(404).json({ error: 'Muestreo no encontrado', codigo });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// DELETE /api/muestreos/:codigo
// ─────────────────────────────────────────────────────────
router.delete('/:codigo', async (req, res) => {
  try {
    const codigo = normalizarCodigo(req.params.codigo);
    const doc    = await Muestreo.findOneAndDelete({ codigo_muestra: codigo });
    if (!doc) return res.status(404).json({ error: 'Muestreo no encontrado', codigo });
    res.json({ ok: true, eliminado: codigo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;