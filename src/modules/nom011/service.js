'use strict';

const { TABLA_LMPE } = require('./model');

// ============================================================================
// CONSTANTES NOM-011-STPS-2001
// ============================================================================
const NIVEL_CRITERIO   = 90;  // dB(A) nivel de criterio
const NIVEL_CAMBIO     = 3;   // dB por duplicación de dosis
const NIVEL_UMBRAL     = 70;  // dB(A) umbral de integración
const JORNADA_BASE     = 8;   // horas base para TMPE

// ============================================================================
// TABLA LMPE — obtener LMPE y TMPE según NER
// NOM-011 Apéndice A, Tabla 1
// ============================================================================
function obtenerLMPE(ner) {
  if (ner === null || ner === undefined) return { lmpe: null, tmpe: null };

  // Buscar el LMPE correspondiente según rangos de la tabla
  if (ner <= 90)  return { lmpe: 90,  tmpe: 8    };
  if (ner <= 93)  return { lmpe: 93,  tmpe: 4    };
  if (ner <= 96)  return { lmpe: 96,  tmpe: 2    };
  if (ner <= 99)  return { lmpe: 99,  tmpe: 1    };
  if (ner <= 102) return { lmpe: 102, tmpe: 0.5  };
  if (ner <= 105) return { lmpe: 105, tmpe: 0.25 };

  return { lmpe: 105, tmpe: 0.25 };
}

// ============================================================================
// PROMEDIO ENERGÉTICO DE LECTURAS (NSCEA,T promedio)
//
// Fórmula:
//   NSCEA,T = 10 × log10( (1/n) × Σ 10^(NSCEk/10) )
//
// Aplica para ruido estable e inestable
// ============================================================================
function calcularNSCEAT(lecturas) {
  if (!lecturas || lecturas.length === 0) return null;

  const valores = lecturas
    .map(l => l.nscea_t)
    .filter(v => v !== null && v !== undefined);

  if (valores.length === 0) return null;

  const suma = valores.reduce((acc, v) => acc + Math.pow(10, v / 10), 0);
  return parseFloat((10 * Math.log10(suma / valores.length)).toFixed(6));
}

// ============================================================================
// NER POR PUNTO FIJO (sonómetro integrador)
//
// Fórmula:
//   NER = NSCEA,Ti + 10 × log10(ti / Te)
//
// Donde:
//   NSCEA,Ti = promedio energético del punto
//   ti       = tiempo de exposición en el punto (horas)
//   Te       = jornada laboral total (horas)
// ============================================================================
function calcularNERPuntoFijo(nscea_t_promedio, tiempo_exposicion_h, jornada_laboral_h) {
  if (nscea_t_promedio === null || nscea_t_promedio === undefined) return null;
  if (!tiempo_exposicion_h || !jornada_laboral_h) return null;

  const ner = nscea_t_promedio + 10 * Math.log10(tiempo_exposicion_h / jornada_laboral_h);
  return parseFloat(ner.toFixed(6));
}

// ============================================================================
// TMPE — Tiempo Máximo Permisible de Exposición
//
// Fórmula:
//   TMPE = 8 / 2^((NER - 90) / 3)
// ============================================================================
function calcularTMPE(ner) {
  if (ner === null || ner === undefined) return null;
  return parseFloat((JORNADA_BASE / Math.pow(2, (ner - NIVEL_CRITERIO) / NIVEL_CAMBIO)).toFixed(6));
}

// ============================================================================
// NER POR DOSIMETRÍA
//
// Fórmula:
//   NER = 90 + 10 × log10( D/100 × Te/8 )
//
// Donde:
//   D  = % de dosis registrado
//   Te = tiempo de medición en horas
// ============================================================================
function calcularNERDosimetria(porcentaje_dosis, tiempo_medicion_h) {
  if (!porcentaje_dosis || !tiempo_medicion_h) return null;
  if (porcentaje_dosis <= 0) return null;

  // Fórmula Excel: 90 + 9.97 × log10(D / (12.5 × T))
  // donde T es tiempo en horas
  const ner = 90 + 9.97 * Math.log10(porcentaje_dosis / (12.5 * tiempo_medicion_h));
  return parseFloat(ner.toFixed(6));
}
// ============================================================================
// EVALUAR CUMPLIMIENTO
// cumple = NER <= LMPE
// ============================================================================
function evaluarCumplimiento(ner, lmpe) {
  if (ner === null || lmpe === null) return null;
  return ner <= lmpe;
}

// ============================================================================
// PROCESAR PUNTO FIJO
// ============================================================================
function procesarPuntoFijo(punto) {
  const nscea_t_promedio = calcularNSCEAT(punto.lecturas);
  const ner              = calcularNERPuntoFijo(
    nscea_t_promedio,
    punto.tiempo_exposicion_h,
    punto.jornada_laboral_h
  );
  const tmpe             = calcularTMPE(ner);
  const { lmpe }         = obtenerLMPE(ner);
  const cumple           = evaluarCumplimiento(ner, lmpe);

  return {
    ...punto,
    nscea_t_promedio,
    ner,
    lmpe,
    tmpe,
    cumple,
  };
}

// ============================================================================
// PROCESAR DOSIMETRÍA
// ============================================================================
function procesarDosimetria(dosimetria) {
  const ner      = calcularNERDosimetria(
    dosimetria.porcentaje_dosis_final,
    dosimetria.tiempo_medicion_h
  );
  const tmpe     = calcularTMPE(ner);
  const { lmpe } = obtenerLMPE(ner);
  const cumple   = evaluarCumplimiento(ner, lmpe);

  return {
    ...dosimetria,
    ner,
    lmpe,
    tmpe,
    cumple,
  };
}

// ============================================================================
// CALCULAR RESULTADOS GLOBALES
// ============================================================================
function calcularResultadosGlobales(puntos_fijos, dosimetrias) {
  // Puesto fijo
  const puntosValidos       = puntos_fijos.filter(p => p.ner !== null);
  const totalPuntos         = puntosValidos.length;
  const puntosCumplen       = puntosValidos.filter(p => p.cumple === true).length;
  const puntosFallidos      = puntosValidos.filter(p => p.cumple === false).map(p => p.numero);

  // Dosimetrías
  const dosisValidas        = dosimetrias.filter(d => d.ner !== null);
  const totalDosis          = dosisValidas.length;
  const dosisCumplen        = dosisValidas.filter(d => d.cumple === true).length;
  const dosisFallidas       = dosisValidas.filter(d => d.cumple === false).map(d => d.numero);

  // Conclusión
  const todosCumplen = puntosFallidos.length === 0 && dosisFallidas.length === 0;
  let conclusion;

  if (todosCumplen) {
    conclusion = 'Los niveles de exposición a ruido medidos cumplen con los Límites Máximos Permisibles de Exposición establecidos en la NOM-011-STPS-2001.';
  } else {
    const partes = [];
    if (puntosFallidos.length > 0) {
      partes.push(`los puntos fijos ${puntosFallidos.join(', ')}`);
    }
    if (dosisFallidas.length > 0) {
      partes.push(`las dosimetrías ${dosisFallidas.join(', ')}`);
    }
    conclusion = `Los niveles de exposición a ruido de ${partes.join(' y ')} no cumplen con los Límites Máximos Permisibles de Exposición establecidos en la NOM-011-STPS-2001.`;
  }

  return {
    total_puntos_fijos:         totalPuntos,
    total_puntos_fijos_cumplen: puntosCumplen,
    puntos_fallidos:            puntosFallidos,
    total_dosimetrias:          totalDosis,
    total_dosimetrias_cumplen:  dosisCumplen,
    dosimetrias_fallidas:       dosisFallidas,
    conclusion_general:         conclusion,
  };
}

module.exports = {
  calcularNSCEAT,
  calcularNERPuntoFijo,
  calcularNERDosimetria,
  calcularTMPE,
  obtenerLMPE,
  evaluarCumplimiento,
  procesarPuntoFijo,
  procesarDosimetria,
  calcularResultadosGlobales,
  NIVEL_CRITERIO,
  NIVEL_CAMBIO,
  NIVEL_UMBRAL,
};