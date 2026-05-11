'use strict';

// ============================================================================
// CONSTANTES NOM-022-STPS-2015
// ============================================================================

const LIMITE_PARARRAYOS = 10;  // ohms - capítulo 8 y 9
const LIMITE_ELECTRODO  = 25;  // ohms - numeral 7.2
const FACTOR_UE         = 0.0053; // incertidumbre expandida k=2

// ============================================================================
// CÁLCULO DE RESULTADO POR POZO
//
// Método caída de tensión:
// - Se toman lecturas a 1m, 4m, 7m, 10m, 13m, 16m, 19m
// - El resultado es la mediana del tramo paralelo (10m normalmente)
// - Excel usa MEDIAN() sobre las lecturas
// ============================================================================

/**
 * Calcula la mediana de un arreglo de números
 */
function calcularMediana(valores) {
  if (!valores || valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? parseFloat(((ordenados[medio - 1] + ordenados[medio]) / 2).toFixed(6))
    : parseFloat(ordenados[medio].toFixed(6));
}

/**
 * Calcula la incertidumbre expandida
 * UE = resultado × FACTOR_UE
 */
function calcularUE(resultadoOhm) {
  if (resultadoOhm === null || resultadoOhm === undefined) return null;
  return parseFloat((resultadoOhm * FACTOR_UE).toFixed(6));
}

/**
 * Determina el límite según el tipo de sistema
 * Pararrayos → 10 ohms
 * Electrodo  → 25 ohms
 */
function obtenerLimite(sistema) {
  return sistema === 'Pararrayos' ? LIMITE_PARARRAYOS : LIMITE_ELECTRODO;
}

/**
 * Evalúa cumplimiento aplicando regla ILAC-G8
 * cumple = resultado <= limite
 * No se aplica UE en la regla de decisión de esta norma
 */
function evaluarCumplimiento(resultadoOhm, limiteOhm) {
  if (resultadoOhm === null || resultadoOhm === undefined) return null;
  return resultadoOhm <= limiteOhm;
}

/**
 * Procesa un pozo completo con sus lecturas
 */
function procesarPozo(pozo) {
  const limite   = obtenerLimite(pozo.sistema);
  const valores  = (pozo.lecturas || []).map(l => l.valor_ohm).filter(v => v !== null && v !== undefined);
  const resultado = calcularMediana(valores);
  const ue        = calcularUE(resultado);
  const cumple    = evaluarCumplimiento(resultado, limite);

  return {
    ...pozo,
    resultado_ohm: resultado,
    limite_ohm:    limite,
    ue_ohm:        ue,
    cumple,
  };
}

/**
 * Evalúa si existe continuidad
 * La norma no establece límite, solo registra si existe o no
 */
function evaluarContinuidad(continuidad_ohm) {
  if (continuidad_ohm === null || continuidad_ohm === undefined) return null;
  return continuidad_ohm > 0;
}

/**
 * Procesa una continuidad
 */
function procesarContinuidad(continuidad) {
  return {
    ...continuidad,
    tiene_continuidad: evaluarContinuidad(continuidad.continuidad_ohm),
  };
}

/**
 * Calcula resultados globales del estudio
 */
function calcularResultadosGlobales(pozos, continuidades) {
  const pozosValidos  = pozos.filter(p => p.resultado_ohm !== null);
  const totalPozos    = pozosValidos.length;
  const pozosCumplen  = pozosValidos.filter(p => p.cumple === true).length;
  const pozosFallidos = pozosValidos.filter(p => p.cumple === false).map(p => p.numero);

  let conclusion;
  if (pozosFallidos.length === 0) {
    conclusion = 'Los valores de resistencia a tierra de la red de puesta a tierra cumplen con los límites máximos permisibles establecidos en la NOM-022-STPS-2015.';
  } else {
    conclusion = `Los valores de resistencia a tierra de los pozos ${pozosFallidos.join(', ')} no cumplen con los límites máximos permisibles establecidos en la NOM-022-STPS-2015.`;
  }

  return {
    total_pozos:         totalPozos,
    total_pozos_cumplen: pozosCumplen,
    total_continuidades: continuidades.length,
    conclusion_general:  conclusion,
    pozos_fallidos:      pozosFallidos,
  };
}

/**
 * Verifica el criterio del terrómetro
 * Las resistencias de verificación inicial y final deben estar dentro de tolerancia
 */
function verificarCriterioTerrometro(verificacion) {
  const { 
    resistencia_1ohm_inicial,  resistencia_1ohm_final,
    resistencia_10ohm_inicial, resistencia_10ohm_final,
    resistencia_22ohm_inicial, resistencia_22ohm_final,
    resistencia_30ohm_inicial, resistencia_30ohm_final,
  } = verificacion;

  const verificar = (inicial, final, tolerancia) => {
    if (!inicial || !final) return null;
    return parseFloat(Math.abs(final - inicial).toFixed(10)) <= tolerancia;
  };

  const cumple1  = verificar(resistencia_1ohm_inicial,  resistencia_1ohm_final,  0.1);
  const cumple10 = verificar(resistencia_10ohm_inicial, resistencia_10ohm_final, 1);
  const cumple22 = verificar(resistencia_22ohm_inicial, resistencia_22ohm_final, 2);
  const cumple30 = verificar(resistencia_30ohm_inicial, resistencia_30ohm_final, 3);

  return {
    cumple_1ohm:  cumple1,
    cumple_10ohm: cumple10,
    cumple_22ohm: cumple22,
    cumple_30ohm: cumple30,
    cumple_criterio: cumple1 !== false && cumple10 !== false && cumple22 !== false && cumple30 !== false,
  };
}

module.exports = {
  procesarPozo,
  procesarContinuidad,
  calcularResultadosGlobales,
  calcularMediana,
  calcularUE,
  obtenerLimite,
  evaluarCumplimiento,
  evaluarContinuidad,
  verificarCriterioTerrometro,
  LIMITE_PARARRAYOS,
  LIMITE_ELECTRODO,
  FACTOR_UE,
};