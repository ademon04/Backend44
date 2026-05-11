// src/modules/nom081/service.js
'use strict';

/**
 * NOM-081-SEMARNAT-1994
 * Límites máximos permisibles de emisión de ruido de fuentes fijas
 */

// Constantes
const FACTOR_N10 = 1.2817;
const FACTOR_CE = 0.9023;

// Límites por zona (Acuerdo 2013)
const LIMITES_POR_ZONA = {
  'Industrial y Comercial': {
    diurno: 68,
    nocturno: 65,
    horarioDiurno: '6:00 a 22:00',
    horarioNocturno: '22:00 a 06:00'
  },
  'Residencial (Exteriores)': {
    diurno: 55,
    nocturno: 50,
    horarioDiurno: '6:00 a 22:00',
    horarioNocturno: '22:00 a 06:00'
  },
  'Escuelas (Áreas Exteriores de Juego)': {
    diurno: 55,
    nocturno: null,
    horarioDiurno: 'Durante el juego',
    horarioNocturno: null
  },
  'Ceremonias, Festivales y Eventos de Entretenimiento.': {
    diurno: 100,
    nocturno: null,
    horarioDiurno: '4 horas',
    horarioNocturno: null
  }
};

/**
 * Calcula N50 (promedio aritmético de las lecturas individuales de un punto)
 */
function calcularN50(lecturas) {
  if (!lecturas || lecturas.length === 0) return 0;
  const suma = lecturas.reduce((a, b) => a + b, 0);
  return parseFloat((suma / lecturas.length).toFixed(6));
}

/**
 * Calcula desviación estándar muestral de las lecturas individuales de un punto
 * Divisor: n-1 (desviación estándar muestral, igual que Excel)
 */
function calcularDesviacionEstandar(lecturas, n50) {
  if (!lecturas || lecturas.length < 2) return 0;
  const sumaCuadrados = lecturas.reduce((acc, val) => {
    return acc + Math.pow(val - n50, 2);
  }, 0);
  return parseFloat(Math.sqrt(sumaCuadrados / (lecturas.length - 1)).toFixed(6));
}

/**
 * Calcula N10 (percentil 90%) de un punto
 * N10 = N50 + 1.2817 * σ
 */
function calcularN10(n50, sigma) {
  return parseFloat((n50 + FACTOR_N10 * sigma).toFixed(6));
}

/**
 * Calcula NEQ de un punto a partir de sus lecturas individuales (36 lecturas)
 * Fórmula Excel: NEQ_punto = 10 * LOG(Σ(10^(Ni/10)) / (n-1))
 * Divisor: n-1 (confirmado contra fórmula Excel: =10*LOG(1/35 * SUMA))
 */
function calcularNEQPunto(lecturas) {
  if (!lecturas || lecturas.length === 0) return 0;
  const sumaDecibeles = lecturas.reduce((acc, val) => {
    return acc + Math.pow(10, val / 10);
  }, 0);
  const neq = 10 * Math.log10(sumaDecibeles / (lecturas.length - 1));
  return parseFloat(neq.toFixed(6));
}

/**
 * Calcula NEQ general (promedio de los 5 puntos A-E)
 * Fórmula Excel: NEQ_prom = 10 * LOG((10^(NEQ_A/10) + ... + 10^(NEQ_E/10)) / 5)
 * Promedio ENERGÉTICO de los NEQ individuales (no aritmético)
 */
function calcularNEQGeneral(puntosCalc) {
  const puntosArray = ['puntoA', 'puntoB', 'puntoC', 'puntoD', 'puntoE'];
  let suma = 0;
  let count = 0;

  for (const key of puntosArray) {
    if (puntosCalc[key] && puntosCalc[key].neq !== undefined && puntosCalc[key].neq !== null) {
      suma += Math.pow(10, puntosCalc[key].neq / 10);
      count++;
    }
  }

  if (count === 0) return 0;
  const neq = 10 * Math.log10(suma / count);
  return parseFloat(neq.toFixed(6));
}

/**
 * Calcula estadísticas completas para un punto (A, B, C, D, E o I-V)
 * A partir de 36 lecturas individuales
 */
function calcularEstadisticasPunto(lecturas) {
  const n50 = calcularN50(lecturas);
  const sigma = calcularDesviacionEstandar(lecturas, n50);
  const n10 = calcularN10(n50, sigma);
  const neq = calcularNEQPunto(lecturas);
  return { lecturas, n50, sigma, n10, neq };
}

/**
 * Calcula estadísticas para todos los puntos (A, B, C, D, E)
 * y promedios generales del período (fuente o fondo)
 */
function calcularPromediosPuntos(puntos) {
  const puntosCalc = {};
  const puntosArray = ['A', 'B', 'C', 'D', 'E'];

  let sumaN50 = 0;
  let sumaSigma = 0;
  let sumaN10 = 0;
  let puntosValidos = 0;

  for (const punto of puntosArray) {
    const key = `punto${punto}`;
    if (puntos[key] && puntos[key].lecturas && puntos[key].lecturas.length > 0) {
      puntosCalc[key] = calcularEstadisticasPunto(puntos[key].lecturas);
      sumaN50    += puntosCalc[key].n50;
      sumaSigma  += puntosCalc[key].sigma;
      sumaN10    += puntosCalc[key].n10;
      puntosValidos++;
    } else {
      puntosCalc[key] = null;
    }
  }

  // NEQ general: promedio energético de los NEQ individuales (fórmula Excel)
  const neqGeneral = calcularNEQGeneral(puntosCalc);

  return {
    puntos: puntosCalc,
    promedios: {
      n50:   puntosValidos > 0 ? parseFloat((sumaN50   / puntosValidos).toFixed(6)) : 0,
      sigma: puntosValidos > 0 ? parseFloat((sumaSigma / puntosValidos).toFixed(6)) : 0,
      n10:   puntosValidos > 0 ? parseFloat((sumaN10   / puntosValidos).toFixed(6)) : 0,
      neq:   neqGeneral
    }
  };
}

/**
 * Ce — corrección por presencia de valores extremos
 * Ce = 0.9023 * σ_promedio_fuente
 */
function calcularCe(sigmaPromedio) {
  return parseFloat((FACTOR_CE * sigmaPromedio).toFixed(6));
}

/**
 * Delta 50 — diferencia de promedios N50 entre fuente y fondo
 */
function calcularDelta50(n50Fuente, n50Fondo) {
  return parseFloat((n50Fuente - n50Fondo).toFixed(6));
}

/**
 * Cf — corrección por ruido de fondo
 * Si Delta50 ≤ 0.75 dB → la fuente no emite nivel sonoro (retorna null)
 * Si Delta50 > 0.75 dB → Cf = -(Delta50 + 9) + 3 * √(4 * Delta50 - 3)
 */
function calcularCf(delta50) {
  if (delta50 <= 0.75) return null;
  const cf = -(delta50 + 9) + 3 * Math.sqrt(4 * delta50 - 3);
  return parseFloat(cf.toFixed(6));
}

/**
 * N'50 — N50 promedio de la fuente corregido por extremos
 * N'50 = N50_fuente + Ce
 */
function calcularNPrima50(n50Fuente, ce) {
  return parseFloat((n50Fuente + ce).toFixed(6));
}

/**
 * N'ff — nivel de fuente fija final
 *
 * Paso 1 — Nff = max(N'50, NEQ_general_fuente)
 *   El Excel compara N'50 contra NEQ antes de aplicar Cf
 *   (fórmula Excel fila 309: "Determinar el valor mayor entre N'50 y NEQ")
 *
 * Paso 2 — N'ff = Nff + Cf
 *
 * Si Delta50 ≤ 0.75 → retorna nivel: null ("No emite nivel sonoro")
 */
function calcularNPrimaPrimaFf(nPrima50, neqGeneral, cf, delta50) {
  if (delta50 <= 0.75) {
    return { nivel: null, observacion: 'No emite nivel sonoro' };
  }
  const nff    = Math.max(nPrima50, neqGeneral);
  const nivel  = nff + cf;
  return {
    nivel: parseFloat(nivel.toFixed(6)),
    observacion: null
  };
}

/**
 * Calcula resultado completo para un período (diurno o nocturno)
 * Recibe los objetos de puntos de fuente y fondo (cada uno con puntoA…puntoE)
 */
function calcularPeriodo(fuentePuntos, fondoPuntos) {
  const fuenteCalc = calcularPromediosPuntos(fuentePuntos);
  const fondoCalc  = calcularPromediosPuntos(fondoPuntos);

  if (fuenteCalc.promedios.n50 === 0 || fondoCalc.promedios.n50 === 0) {
    return { error: 'Datos insuficientes' };
  }

  const ce       = calcularCe(fuenteCalc.promedios.sigma);
  const delta50  = calcularDelta50(fuenteCalc.promedios.n50, fondoCalc.promedios.n50);
  const cf       = calcularCf(delta50);
  const nPrima50 = calcularNPrima50(fuenteCalc.promedios.n50, ce);

  // N'ff: usa NEQ energético de la fuente (ya incluido en fuenteCalc.promedios.neq)
  const resultado = calcularNPrimaPrimaFf(
    nPrima50,
    fuenteCalc.promedios.neq,
    cf,
    delta50
  );

  return {
    fuente: {
      promedios: fuenteCalc.promedios
    },
    fondo: {
      promedios: fondoCalc.promedios
    },
    ce,
    delta50,
    cf:          cf !== null ? cf : null,
    nPrima50,
    neqGeneral:  fuenteCalc.promedios.neq,
    nivelFinal:  resultado.nivel,
    observacion: resultado.observacion
  };
}

/**
 * Retorna límites máximos permisibles según tipo de zona
 */
function obtenerLimites(tipoZona) {
  return LIMITES_POR_ZONA[tipoZona] || LIMITES_POR_ZONA['Industrial y Comercial'];
}

/**
 * Evalúa cumplimiento contra el límite de zona
 * Si nivel es null (delta50 ≤ 0.75) se considera cumplimiento automático
 */
function evaluarCumplimiento(nivel, limite) {
  if (nivel === null) return true;
  return nivel <= limite;
}

/**
 * Calcula incertidumbre expandida (UE)
 *
 * tipo_incertidumbre === 'porcentaje':
 *   UE = (incertidumbre_global / 100) * nivelFinal
 *   Ej: 0.3% × 50.170861 = 0.150513 dB  (coincide con Excel portada)
 *
 * tipo_incertidumbre === 'db':
 *   UE = incertidumbre_global  (valor fijo en dB)
 */
function calcularIncertidumbre(nivelFinal, sonometro) {
  if (!sonometro || nivelFinal === null) return null;

  let incertidumbre = sonometro.incertidumbre_global;

  if (sonometro.tipo_incertidumbre === 'porcentaje') {
    incertidumbre = (incertidumbre / 100) * nivelFinal;
  }

  return parseFloat(incertidumbre.toFixed(6));
}

/**
 * Función principal — calcula estudio NOM-081 completo
 *
 * @param {object} datos
 * @param {string} datos.zona_tipo
 * @param {object} datos.mediciones  — { diurno: { fuente, fondo }, nocturno: { fuente, fondo } }
 * @param {object} [datos.sonometro] — documento SonometroNOM081 (para incertidumbre)
 */
function calcularMuestreoNOM081(datos) {
  const { zona_tipo, mediciones, sonometro } = datos;
  const limites = obtenerLimites(zona_tipo);

  const resultados = {
    zona: {
      tipo: zona_tipo,
      ...limites
    },
    diurno:    null,
    nocturno:  null,
    conclusion: {}
  };

  // ── Período diurno ─────────────────────────────────────────────────────────
  if (mediciones?.diurno?.fuente && mediciones?.diurno?.fondo) {
    const diurnoCalc = calcularPeriodo(mediciones.diurno.fuente, mediciones.diurno.fondo);
    if (!diurnoCalc.error) {
      const cumple        = evaluarCumplimiento(diurnoCalc.nivelFinal, limites.diurno);
      const incertidumbre = sonometro
        ? calcularIncertidumbre(diurnoCalc.nivelFinal, sonometro)
        : null;

      resultados.diurno = {
        ...diurnoCalc,
        limite:        limites.diurno,
        cumple,
        horario:       limites.horarioDiurno,
        incertidumbre
      };
    }
  }

  // ── Período nocturno ───────────────────────────────────────────────────────
  if (
    mediciones?.nocturno?.fuente &&
    mediciones?.nocturno?.fondo &&
    limites.nocturno !== null
  ) {
    const nocturnoCalc = calcularPeriodo(mediciones.nocturno.fuente, mediciones.nocturno.fondo);
    if (!nocturnoCalc.error) {
      const cumple        = evaluarCumplimiento(nocturnoCalc.nivelFinal, limites.nocturno);
      const incertidumbre = sonometro
        ? calcularIncertidumbre(nocturnoCalc.nivelFinal, sonometro)
        : null;

      resultados.nocturno = {
        ...nocturnoCalc,
        limite:        limites.nocturno,
        cumple,
        horario:       limites.horarioNocturno,
        incertidumbre
      };
    }
  }

  // ── Conclusión ─────────────────────────────────────────────────────────────
  const diurnoCumple   = resultados.diurno   ? resultados.diurno.cumple   : true;
  const nocturnoCumple = resultados.nocturno ? resultados.nocturno.cumple : true;

  if (diurnoCumple && nocturnoCumple) {
    resultados.conclusion = {
      texto:           'El nivel sonoro, diurno y nocturno, emitido por la empresa, no rebasa el límite máximo permisible.',
      diurno_cumple:   true,
      nocturno_cumple: true
    };
  } else if (!diurnoCumple && !nocturnoCumple) {
    resultados.conclusion = {
      texto:           'El nivel sonoro, diurno y nocturno, emitido por la empresa, rebasa el límite máximo permisible.',
      diurno_cumple:   false,
      nocturno_cumple: false
    };
  } else if (!diurnoCumple) {
    resultados.conclusion = {
      texto:           'El nivel sonoro diurno emitido por la empresa rebasa el límite máximo permisible.',
      diurno_cumple:   false,
      nocturno_cumple: true
    };
  } else {
    resultados.conclusion = {
      texto:           'El nivel sonoro nocturno emitido por la empresa rebasa el límite máximo permisible.',
      diurno_cumple:   true,
      nocturno_cumple: false
    };
  }

  return resultados;
}

module.exports = {
  // Principal
  calcularMuestreoNOM081,

  // Utilidades de evaluación
  obtenerLimites,
  evaluarCumplimiento,
  calcularIncertidumbre,

  // Cálculo por punto
  calcularN50,
  calcularDesviacionEstandar,
  calcularN10,
  calcularNEQPunto,
  calcularNEQGeneral,
  calcularEstadisticasPunto,
  calcularPromediosPuntos,

  // Cálculo del período
  calcularCe,
  calcularDelta50,
  calcularCf,
  calcularNPrima50,
  calcularNPrimaPrimaFf,
  calcularPeriodo,

  // Constantes
  LIMITES_POR_ZONA,
  FACTOR_N10,
  FACTOR_CE
};