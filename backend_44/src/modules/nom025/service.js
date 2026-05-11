// src/modules/nom025/service.js
'use strict';

// ============================================================================
// SELECTOR DE FACTOR — Replica fórmula Excel HM-T C38/C39
//
// Excel: INDEX(FC, MATCH(MIN(ABS(ILUM_REF - lux)), ABS(ILUM_REF - lux), 0))
// Selecciona el factor cuya iluminancia_ref sea la más cercana al lux dado.
//
// @param {Number} lux                - valor a buscar
// @param {Array}  factoresCorreccion - [{ iluminancia_ref, factor }, ...]
// @returns {Number} factor de corrección, Elige el factor de correxion a aplicar 
//=(INDICE(FACTOR_DE_CORRECCIÓN,COINCIDIR(MIN(ABS(ILUMINANCIA_DE_REFERENCIA-C12)),ABS(ILUMINANCIA_DE_REFERENCIA-C12),0))*C12)/(INDICE(FACTOR_DE_CORRECCIÓN,COINCIDIR(MIN(ABS(ILUMINANCIA_DE_REFERENCIA-C13)),ABS(ILUMINANCIA_DE_REFERENCIA-C13),0))*C13)*100
// Compara distancia de cada elemento
// prev = {iluminancia_ref:100, factor:0.95} distancia=250
// curr = {iluminancia_ref:200, factor:0.97} distancia=150 ← menor
// curr = {iluminancia_ref:500, factor:1.02} distancia=150 ← empate, mantiene el primero (200)
// resultado final: prev = {iluminancia_ref:200, factor:0.97}
// ============================================================================
function seleccionarFactor(lux, factoresCorreccion) {
  if (!lux || !factoresCorreccion || factoresCorreccion.length === 0) return 1.0;
  return factoresCorreccion.reduce((prev, curr) =>
    Math.abs(curr.iluminancia_ref - lux) < Math.abs(prev.iluminancia_ref - lux) ? curr : prev
  ).factor;
}

// ============================================================================
// CÁLCULOS DE ILUMINACIÓN
// ============================================================================

/**
 * lux_corregido = lux_medido × fc(lux_medido)
 * /=INDICE(FACTOR_DE_CORRECCIÓN,COINCIDIR(MIN(ABS(ILUMINANCIA_DE_REFERENCIA-C11)),ABS(ILUMINANCIA_DE_REFERENCIA-C11),0))*C11
 * Fórmula Excel C38: INDEX(FC, MATCH(MIN(ABS(ILUM_REF-lux)), ...)) × lux
 * /**
 * Corrige el lux medido aplicando el factor de corrección.
 * 
 * Fórmula Excel: =INDEX(FACTOR_DE_CORRECCIÓN, MATCH(MIN(ABS(REF - lux)), ABS(REF - lux), 0)) * lux
 * 
 * @param {Number} lux - Lux medido por el instrumento
 * @param {Array} factoresCorreccion - Tabla de factores de corrección
 * @returns {Number} Lux corregido (redondeado a 1 decimal)
 * 
 * @see seleccionarFactor - Para detalles sobre la selección del factor
 *
 */
function corregirLux(lux, factoresCorreccion) {
  const fc = seleccionarFactor(lux, factoresCorreccion);
  return parseFloat((lux * fc).toFixed(1));
}

/**
 * kf (%) = (fc(E1) × E1) / (fc(E2) × E2) × 100
 *
 * IMPORTANTE: E1 y E2 se corrigen con sus propios factores independientes.
 * Fórmula Excel C39:
 *   (INDEX(FC,MATCH(MIN(ABS(ILUM_REF-E1)),ABS(ILUM_REF-E1),0)) × E1)
 *   /
 *   (INDEX(FC,MATCH(MIN(ABS(ILUM_REF-E2)),ABS(ILUM_REF-E2),0)) × E2)
 *   × 100
 *
 * Devuelve null si E1 o E2 son nulos o '----'.
 */
function calcularKf(e1, e2, factoresCorreccion) {
  if (e1 === null || e1 === undefined || e1 === '----') return null;
  if (e2 === null || e2 === undefined || e2 === '----' || e2 === 0) return null;

  const fc1 = seleccionarFactor(e1, factoresCorreccion);
  const fc2 = seleccionarFactor(e2, factoresCorreccion);
  return parseFloat(((fc1 * e1) / (fc2 * e2) * 100).toFixed(1));
}

/**
 * UE (lux) = lux_corregido × u_relativa
 *
 * Fórmula Excel T19: Q19 × $U$84/100
 *   donde Q19 = lux_corregido, U84 = 3.66 (Generador!F9)
 *   u_relativa = 3.66/100 = 0.0366
 */
function calcularUE(luxCorregido, uRelativa = 0.0366) {
  if (!luxCorregido) return 0;
  return parseFloat((luxCorregido * uRelativa).toFixed(1));
}

// ============================================================================
// VERIFICACIONES DE CUMPLIMIENTO
// ============================================================================

/**
 * Regla ILAC-G8: cumple si (lux_corregido - UE) >= NMI
 */
function verificarCumplimientoLux(luxCorregido, nmiRequerido, ue = 0) {
  if (luxCorregido === null || luxCorregido === undefined || !nmiRequerido) return null;
  return (luxCorregido - ue) >= nmiRequerido;
}

/** cumple si kf_plano ≤ 50% */
function verificarCumplimientoPlano(kfPlano) {
  if (kfPlano === null || kfPlano === undefined) return null;
  return kfPlano <= 50;
}

/** cumple si kf_pared ≤ 60% */
function verificarCumplimientoPared(kfPared) {
  if (kfPared === null || kfPared === undefined) return null;
  return kfPared <= 60;
}

/**
 * Criterio del luxómetro: lectura_final dentro del ±5% de lectura_inicial
 */
function verificarCriterioLuxometro(lecturaInicial, lecturaFinal) {
  if (!lecturaInicial || !lecturaFinal) return null;
  const limiteInferior = lecturaInicial * 0.95;
  const limiteSuperior = lecturaInicial * 1.05;
  const cumple = lecturaFinal >= limiteInferior && lecturaFinal <= limiteSuperior;
  return {
    cumple,
    limite_inferior:       parseFloat(limiteInferior.toFixed(2)),
    limite_superior:       parseFloat(limiteSuperior.toFixed(2)),
    porcentaje_desviacion: parseFloat(((lecturaFinal - lecturaInicial) / lecturaInicial * 100).toFixed(2))
  };
}

// ============================================================================
// PROCESAMIENTO DE LECTURAS
// ============================================================================

/**
 * Procesa una lectura individual aplicando las fórmulas exactas del Excel.
 *
 * @param {Object} lectura            - { hora, lux_medido, e1_plano, e2_plano, e1_pared, e2_pared }
 * @param {Number} nmiRequerido
 * @param {Array}  factoresCorreccion - [{ iluminancia_ref, factor }]
 * @param {Number} uRelativa          - del campo luxometro.u_relativa (ej: 0.0366)
 */
function procesarLectura(lectura, nmiRequerido, factoresCorreccion, uRelativa = 0.0366) {
  const luxCorregido = corregirLux(lectura.lux_medido, factoresCorreccion);
  const ue           = calcularUE(luxCorregido, uRelativa);
  const kfPlano      = calcularKf(lectura.e1_plano, lectura.e2_plano, factoresCorreccion);
  const kfPared      = calcularKf(lectura.e1_pared, lectura.e2_pared, factoresCorreccion);

  return {
    hora:          lectura.hora,
    lux_medido:    lectura.lux_medido,
    lux_corregido: luxCorregido,
    e1_plano:      lectura.e1_plano  ?? null,
    e2_plano:      lectura.e2_plano  ?? null,
    kf_plano:      kfPlano,
    e1_pared:      lectura.e1_pared  ?? null,
    e2_pared:      lectura.e2_pared  ?? null,
    kf_pared:      kfPared,
    ue,
    cumple_lux:    verificarCumplimientoLux(luxCorregido, nmiRequerido, ue),
    cumple_plano:  verificarCumplimientoPlano(kfPlano),
    cumple_pared:  verificarCumplimientoPared(kfPared)
  };
}

/**
 * Consolida las lecturas de un punto en un resultado único.
 *
 * promedio_lux_corregido = (1/N) × Σ lux_corregido_i
 * promedio_kf_plano      = (1/N) × Σ kf_plano_i  (solo lecturas con reflexión medida)
 * ue_max                 = max(UE_i)              (criterio conservador ILAC-G8)
 * cumple_lux             = (promedio_lux_corregido - ue_max) >= NMI
 */
function consolidarLecturas(lecturasProcesadas, nmiRequerido) {
  if (!lecturasProcesadas || lecturasProcesadas.length === 0) {
    return { promedio_lux_corregido: null, promedio_kf_plano: null,
             promedio_kf_pared: null, ue_max: null,
             cumple_lux: null, cumple_plano: null, cumple_pared: null, cumple_total: null };
  }

  const luxes = lecturasProcesadas.map(l => l.lux_corregido).filter(v => v != null);
  const promedioLux = luxes.length > 0
    ? parseFloat((luxes.reduce((a, b) => a + b, 0) / luxes.length).toFixed(5)) : null;

  const kfPlanos = lecturasProcesadas.map(l => l.kf_plano).filter(v => v != null);
  const promedioKfPlano = kfPlanos.length > 0
    ? parseFloat((kfPlanos.reduce((a, b) => a + b, 0) / kfPlanos.length).toFixed(5)) : null;

  const kfPareds = lecturasProcesadas.map(l => l.kf_pared).filter(v => v != null);
  const promedioKfPared = kfPareds.length > 0
    ? parseFloat((kfPareds.reduce((a, b) => a + b, 0) / kfPareds.length).toFixed(5)) : null;

  const ues = lecturasProcesadas.map(l => l.ue).filter(v => v != null);
  const ueMax = ues.length > 0 ? Math.max(...ues) : 0;

  const cumpleLux = verificarCumplimientoLux(promedioLux, nmiRequerido, ueMax);

  const planosConValor = lecturasProcesadas.filter(l => l.cumple_plano !== null);
  const cumplePlano = planosConValor.length > 0
    ? planosConValor.every(l => l.cumple_plano !== false) : null;

  const paredsConValor = lecturasProcesadas.filter(l => l.cumple_pared !== null);
  const cumplePared = paredsConValor.length > 0
    ? paredsConValor.every(l => l.cumple_pared !== false) : null;

  return {
    promedio_lux_corregido: promedioLux,
    promedio_kf_plano:      promedioKfPlano,
    promedio_kf_pared:      promedioKfPared,
    ue_max:                 parseFloat(ueMax.toFixed(5)),
    cumple_lux:             cumpleLux,
    cumple_plano:           cumplePlano,
    cumple_pared:           cumplePared,
    cumple_total:           cumpleLux === true && cumplePlano !== false && cumplePared !== false
  };
}

/**
 * Procesa un punto completo con sus lecturas.
 */
function procesarPunto(punto, nmiRequerido, factoresCorreccion, uRelativa = 0.0366) {
  const nmi = punto.nmi_requerido || nmiRequerido;

  const lecturasProcesadas = (punto.lecturas || []).map(l =>
    procesarLectura(l, nmi, factoresCorreccion, uRelativa)
  );

  return {
    numero:           punto.numero,
    area_id:          punto.area_id,
    ubicacion:        punto.ubicacion,
    tipo_iluminacion: punto.tipo_iluminacion,
    iluminacion_tipo: punto.iluminacion_tipo,
    nmi_requerido:    nmi,
    tarea_visual:     punto.tarea_visual,
    superficie_color: punto.superficie_color,
    descripcion_tarea_visual_nom025: punto.descripcion_tarea_visual_nom025,
    descripcion_tarea_localizada:    punto.descripcion_tarea_localizada,
    tipo_luminarias:                 punto.tipo_luminarias,
    cantidad_luminarias:             punto.cantidad_luminarias,
    potencia_luminarias:             punto.potencia_luminarias,
    metodo_cantidad:                 punto.metodo_cantidad,
    trabajadores_expuestos:          punto.trabajadores_expuestos,
    puesto_trabajo:                  punto.puesto_trabajo,
    descripcion_actividades:         punto.descripcion_actividades,
    lecturas: lecturasProcesadas,
    ...consolidarLecturas(lecturasProcesadas, nmi)
  };
}

// ============================================================================
// PROCESAMIENTO DE ÁREAS Y RESULTADOS GLOBALES
// ============================================================================

function calcularIndiceArea(largo, ancho, alturaMontaje) {
  if (!largo || !ancho || !alturaMontaje || alturaMontaje === 0) return null;
  return parseFloat(((largo * ancho) / (alturaMontaje * (largo + ancho))).toFixed(4));
}

function calcularPuntosMinimos(ic, conLimitacion = false) {
  if (ic === null || ic === undefined) return null;
  let i = 0;
  if (ic >= 3) i = 3; else if (ic >= 2) i = 2; else if (ic >= 1) i = 1;
  return conLimitacion ? [[4,6],[9,12],[16,20],[25,30]][i][1] : [[4,6],[9,12],[16,20],[25,30]][i][0];
}

function procesarArea(area, puntos) {
  const ic = area.indice_area || calcularIndiceArea(area.dimension_largo, area.dimension_ancho, area.altura_montaje);

  const validos = puntos.filter(p => p.promedio_lux_corregido != null);
  const luxes   = validos.map(p => p.promedio_lux_corregido);
  const promedioLux = luxes.length > 0
    ? parseFloat((luxes.reduce((a, b) => a + b, 0) / luxes.length).toFixed(5)) : null;

  const ues = validos.map(p => p.ue_max).filter(v => v != null);
  const ueAreaMax = ues.length > 0 ? Math.max(...ues) : 0;

  const cumpleLux = promedioLux !== null ? (promedioLux - ueAreaMax) >= area.nmi_requerido : null;
  const cumpleReflexion = validos.every(p => p.cumple_plano !== false && p.cumple_pared !== false);

  return {
    area_id:          area._id,
    nombre:           area.nombre,
    indice_area:      ic,
    puntos_minimos:   calcularPuntosMinimos(ic),
    puntos_medidos:   puntos.length,
    puntos_validos:   validos.length,
    nmi_requerido:    area.nmi_requerido,
    promedio_lux:     promedioLux,
    ue_area_max:      parseFloat(ueAreaMax.toFixed(5)),
    cumple_lux:       cumpleLux,
    cumple_reflexion: cumpleReflexion,
    cumple_total:     cumpleLux === true && cumpleReflexion,
    puntos:           validos
  };
}

function calcularResultadosGlobales(areasProcesadas, todosLosPuntos) {
  let medidos = 0, cumplen = 0, areasCumplen = 0;
  const fallidos = [];

  for (const p of todosLosPuntos) {
    if (p.promedio_lux_corregido != null) {
      medidos++;
      if (p.cumple_total === true) cumplen++;
      else fallidos.push(p.numero);
    }
  }
  for (const a of areasProcesadas) { if (a.cumple_total) areasCumplen++; }

  const pct = medidos > 0 ? parseFloat(((cumplen / medidos) * 100).toFixed(2)) : 0;
  let conclusion;
  if (pct >= 80 && areasCumplen === areasProcesadas.length) conclusion = 'CUMPLE';
  else if (pct >= 80) conclusion = 'CUMPLE PARCIALMENTE';
  else conclusion = 'NO CUMPLE';

  return {
    total_puntos_medidos:    medidos,
    total_puntos_cumplen:    cumplen,
    porcentaje_cumplimiento: pct,
    conclusion_general:      conclusion,
    puntos_fallidos:         fallidos,
    areas_cumplen:           areasCumplen,
    areas_totales:           areasProcesadas.length
  };
}

// ============================================================================
// UTILIDADES
// ============================================================================

function obtenerNMI(tareaVisual) {
  const t = {
    exteriores_general: 20, interiores_general: 50, circulacion_pasillos: 100,
    requerimiento_simple: 200, distincion_moderada: 300, distincion_clara: 500,
    distincion_fina: 750, alta_exactitud: 1000, alto_grado_especializacion: 2000
  };
  return t[tareaVisual] || null;
}

module.exports = {
  seleccionarFactor,
  corregirLux,
  calcularKf,
  calcularUE,
  verificarCumplimientoLux,
  verificarCumplimientoPlano,
  verificarCumplimientoPared,
  verificarCriterioLuxometro,
  procesarLectura,
  consolidarLecturas,
  procesarPunto,
  calcularIndiceArea,
  calcularPuntosMinimos,
  procesarArea,
  calcularResultadosGlobales,
  obtenerNMI
};