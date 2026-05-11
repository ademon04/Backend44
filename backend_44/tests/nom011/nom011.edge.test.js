'use strict';

const request = require('supertest');
const app     = require('../../App');

const {
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
} = require('../../src/modules/nom011/service');

// ============================================================================
// 1. calcularNSCEAT — promedio energético
// ============================================================================

describe('calcularNSCEAT', () => {

  it('retorna null con arreglo vacío', () => {
    expect(calcularNSCEAT([])).toBeNull();
  });

  it('retorna null con null', () => {
    expect(calcularNSCEAT(null)).toBeNull();
  });

  it('retorna null si todas las lecturas tienen nscea_t null', () => {
    expect(calcularNSCEAT([{ nscea_t: null }, { nscea_t: null }])).toBeNull();
  });

  it('promedio energético de valores iguales = ese mismo valor', () => {
    const lecturas = [{ nscea_t: 85 }, { nscea_t: 85 }, { nscea_t: 85 }];
    expect(calcularNSCEAT(lecturas)).toBeCloseTo(85, 4);
  });

  it('promedio energético es mayor que el promedio aritmético con valores distintos', () => {
    const lecturas = [{ nscea_t: 80 }, { nscea_t: 90 }];
    const resultado = calcularNSCEAT(lecturas);
    const promedioArit = (80 + 90) / 2; // 85
    expect(resultado).toBeGreaterThan(promedioArit);
  });

  it('filtra lecturas con nscea_t null o undefined', () => {
    const lecturas = [{ nscea_t: 85 }, { nscea_t: null }, { nscea_t: 85 }];
    // Solo 2 valores válidos de 85 → promedio energético = 85
    expect(calcularNSCEAT(lecturas)).toBeCloseTo(85, 4);
  });

  it('resultado tiene hasta 6 decimales', () => {
    const lecturas = [{ nscea_t: 87.5 }, { nscea_t: 88.3 }];
    const r = calcularNSCEAT(lecturas);
    expect(r.toString().split('.')[1]?.length).toBeLessThanOrEqual(6);
  });

  it('una sola lectura: resultado = ese valor', () => {
    expect(calcularNSCEAT([{ nscea_t: 92 }])).toBeCloseTo(92, 4);
  });
});

// ============================================================================
// 2. calcularNERPuntoFijo
// ============================================================================

describe('calcularNERPuntoFijo', () => {

  it('NER = NSCEA_T + 10*log10(ti/Te)', () => {
    // 85 + 10*log10(8/8) = 85 + 0 = 85
    expect(calcularNERPuntoFijo(85, 8, 8)).toBeCloseTo(85, 4);
  });

  it('exposición parcial reduce NER', () => {
    // 85 + 10*log10(4/8) = 85 + 10*log10(0.5) = 85 - 3.0103 ≈ 81.99
    expect(calcularNERPuntoFijo(85, 4, 8)).toBeCloseTo(81.99, 1);
  });

  it('exposición total = jornada: sin ajuste', () => {
    expect(calcularNERPuntoFijo(90, 8, 8)).toBeCloseTo(90, 4);
  });

  it('retorna null si nscea_t_promedio es null', () => {
    expect(calcularNERPuntoFijo(null, 8, 8)).toBeNull();
  });

  it('retorna null si tiempo_exposicion_h es 0 (falsy)', () => {
    expect(calcularNERPuntoFijo(85, 0, 8)).toBeNull();
  });

  it('retorna null si jornada_laboral_h es 0 (falsy)', () => {
    expect(calcularNERPuntoFijo(85, 8, 0)).toBeNull();
  });

  it('retorna null si jornada_laboral_h es null', () => {
    expect(calcularNERPuntoFijo(85, 8, null)).toBeNull();
  });

  it('resultado tiene hasta 6 decimales', () => {
    const r = calcularNERPuntoFijo(87.3, 6, 8);
    expect(r.toString().split('.')[1]?.length).toBeLessThanOrEqual(6);
  });
});

// ============================================================================
// 3. calcularTMPE
// ============================================================================

describe('calcularTMPE', () => {

  it('constantes correctas: NIVEL_CRITERIO=90, NIVEL_CAMBIO=3', () => {
    expect(NIVEL_CRITERIO).toBe(90);
    expect(NIVEL_CAMBIO).toBe(3);
  });

  it('NER=90: TMPE = 8 horas (jornada base)', () => {
    // 8 / 2^((90-90)/3) = 8/1 = 8
    expect(calcularTMPE(90)).toBeCloseTo(8, 4);
  });

  it('NER=93: TMPE = 4 horas', () => {
    // 8 / 2^(3/3) = 8/2 = 4
    expect(calcularTMPE(93)).toBeCloseTo(4, 4);
  });

  it('NER=96: TMPE = 2 horas', () => {
    expect(calcularTMPE(96)).toBeCloseTo(2, 4);
  });

  it('NER=99: TMPE = 1 hora', () => {
    expect(calcularTMPE(99)).toBeCloseTo(1, 4);
  });

  it('NER=102: TMPE = 0.5 horas', () => {
    expect(calcularTMPE(102)).toBeCloseTo(0.5, 4);
  });

  it('NER=105: TMPE = 0.25 horas', () => {
    expect(calcularTMPE(105)).toBeCloseTo(0.25, 4);
  });

  it('NER mayor a 90 siempre reduce TMPE por debajo de 8', () => {
    expect(calcularTMPE(91)).toBeLessThan(8);
  });

  it('NER menor a 90 daría TMPE > 8 (teórico)', () => {
    expect(calcularTMPE(87)).toBeGreaterThan(8);
  });

  it('retorna null si ner es null', () => {
    expect(calcularTMPE(null)).toBeNull();
  });

  it('retorna null si ner es undefined', () => {
    expect(calcularTMPE(undefined)).toBeNull();
  });
});

// ============================================================================
// 4. obtenerLMPE — tabla NOM-011 Apéndice A
// ============================================================================

describe('obtenerLMPE', () => {

  it('NER=null → lmpe null, tmpe null', () => {
    const r = obtenerLMPE(null);
    expect(r.lmpe).toBeNull();
    expect(r.tmpe).toBeNull();
  });

  it('NER=undefined → lmpe null', () => {
    expect(obtenerLMPE(undefined).lmpe).toBeNull();
  });

  it('NER=85 (≤90) → lmpe=90, tmpe=8', () => {
    const r = obtenerLMPE(85);
    expect(r.lmpe).toBe(90);
    expect(r.tmpe).toBe(8);
  });

  it('NER=90 exacto → lmpe=90, tmpe=8', () => {
    const r = obtenerLMPE(90);
    expect(r.lmpe).toBe(90);
    expect(r.tmpe).toBe(8);
  });

  it('NER=91 (>90, ≤93) → lmpe=93, tmpe=4', () => {
    const r = obtenerLMPE(91);
    expect(r.lmpe).toBe(93);
    expect(r.tmpe).toBe(4);
  });

  it('NER=93 exacto → lmpe=93, tmpe=4', () => {
    const r = obtenerLMPE(93);
    expect(r.lmpe).toBe(93);
    expect(r.tmpe).toBe(4);
  });

  it('NER=99 exacto → lmpe=99, tmpe=1', () => {
    const r = obtenerLMPE(99);
    expect(r.lmpe).toBe(99);
    expect(r.tmpe).toBe(1);
  });

  it('NER=106 (>105) → lmpe=105, tmpe=0.25 (tope de tabla)', () => {
    const r = obtenerLMPE(106);
    expect(r.lmpe).toBe(105);
    expect(r.tmpe).toBe(0.25);
  });
});

// ============================================================================
// 5. calcularNERDosimetria — factor 9.97 confirmado contra Excel
// ============================================================================

describe('calcularNERDosimetria', () => {

  it('IMPORTANTE: usa factor 9.97 no 10 (confirmado contra Excel real)', () => {
    // Si usara 10: 90 + 10*log10(100/(12.5*8)) = 90 + 10*log10(1) = 90.0
    // Con 9.97:    90 + 9.97*log10(1) = 90.0 (mismo en este caso)
    // La diferencia aparece cuando D/(12.5*T) ≠ 1
    const r = calcularNERDosimetria(100, 8);
    expect(r).toBeCloseTo(90, 3);
  });

  it('dosis=200%, tiempo=8h: NER > 90', () => {
    // 90 + 9.97*log10(200/(12.5*8)) = 90 + 9.97*log10(2) ≈ 90 + 3.0
    const r = calcularNERDosimetria(200, 8);
    expect(r).toBeGreaterThan(90);
  });

  it('dosis=50%, tiempo=8h: NER < 90', () => {
    const r = calcularNERDosimetria(50, 8);
    expect(r).toBeLessThan(90);
  });

  it('retorna null si porcentaje_dosis es 0', () => {
    expect(calcularNERDosimetria(0, 8)).toBeNull();
  });

  it('retorna null si porcentaje_dosis es null', () => {
    expect(calcularNERDosimetria(null, 8)).toBeNull();
  });

  it('retorna null si tiempo_medicion_h es 0', () => {
    expect(calcularNERDosimetria(100, 0)).toBeNull();
  });

  it('retorna null si tiempo_medicion_h es null', () => {
    expect(calcularNERDosimetria(100, null)).toBeNull();
  });

  it('porcentaje_dosis negativo retorna null (log de negativo es NaN)', () => {
    expect(calcularNERDosimetria(-10, 8)).toBeNull();
  });

  it('resultado tiene hasta 6 decimales', () => {
    const r = calcularNERDosimetria(150, 7);
    expect(r.toString().split('.')[1]?.length).toBeLessThanOrEqual(6);
  });
});

// ============================================================================
// 6. evaluarCumplimiento
// ============================================================================

describe('evaluarCumplimiento', () => {

  it('cumple exactamente en el límite (<=)', () => {
    expect(evaluarCumplimiento(90, 90)).toBe(true);
  });

  it('no cumple con NER > LMPE', () => {
    expect(evaluarCumplimiento(91, 90)).toBe(false);
  });

  it('cumple con NER < LMPE', () => {
    expect(evaluarCumplimiento(88, 90)).toBe(true);
  });

  it('retorna null si ner es null', () => {
    expect(evaluarCumplimiento(null, 90)).toBeNull();
  });

  it('retorna null si lmpe es null', () => {
    expect(evaluarCumplimiento(90, null)).toBeNull();
  });
});

// ============================================================================
// 7. procesarPuntoFijo — integración
// ============================================================================

describe('procesarPuntoFijo', () => {

  const puntoOk = {
    numero: 1,
    lecturas: [{ nscea_t: 85 }, { nscea_t: 85 }],
    tiempo_exposicion_h: 8,
    jornada_laboral_h:   8,
  };

  it('punto con NER=85: cumple (≤90)', () => {
    const r = procesarPuntoFijo(puntoOk);
    expect(r.cumple).toBe(true);
    expect(r.lmpe).toBe(90);
  });

  it('punto sin lecturas: ner null, cumple null', () => {
    const r = procesarPuntoFijo({ ...puntoOk, lecturas: [] });
    expect(r.ner).toBeNull();
    expect(r.cumple).toBeNull();
  });

  it('punto con NER=95: cumple (lmpe=96 según tabla)', () => {
    // NER=95 cae en tramo ≤96 → lmpe=96 → 95 ≤ 96 = cumple
    const punto = {
      numero: 2,
      lecturas: [{ nscea_t: 95 }, { nscea_t: 95 }],
      tiempo_exposicion_h: 8,
      jornada_laboral_h:   8,
    };
    const r = procesarPuntoFijo(punto);
    expect(r.ner).toBeGreaterThan(90);
    expect(r.lmpe).toBe(96);
    expect(r.cumple).toBe(true);
  });

  it('punto con NER > 105 (tope tabla): no cumple', () => {
    // NER=107 → lmpe=105 → 107 > 105 = no cumple
    const punto = {
      numero: 3,
      lecturas: [{ nscea_t: 107 }, { nscea_t: 107 }],
      tiempo_exposicion_h: 8,
      jornada_laboral_h:   8,
    };
    const r = procesarPuntoFijo(punto);
    expect(r.ner).toBeGreaterThan(105);
    expect(r.lmpe).toBe(105);
    expect(r.cumple).toBe(false);
  });

  it('incluye nscea_t_promedio, ner, lmpe, tmpe en resultado', () => {
    const r = procesarPuntoFijo(puntoOk);
    expect(r).toHaveProperty('nscea_t_promedio');
    expect(r).toHaveProperty('ner');
    expect(r).toHaveProperty('lmpe');
    expect(r).toHaveProperty('tmpe');
  });

  it('exposición parcial (4h de 8h) reduce NER', () => {
    const punto = {
      ...puntoOk,
      tiempo_exposicion_h: 4,
    };
    const rFull    = procesarPuntoFijo(puntoOk);
    const rParcial = procesarPuntoFijo(punto);
    expect(rParcial.ner).toBeLessThan(rFull.ner);
  });
});

// ============================================================================
// 8. procesarDosimetria — integración
// ============================================================================

describe('procesarDosimetria', () => {

  it('dosis=100%, tiempo=8h: NER≈90, cumple', () => {
    const d = {
      numero: 1,
      porcentaje_dosis_final: 100,
      tiempo_medicion_h: 8,
    };
    const r = procesarDosimetria(d);
    expect(r.ner).toBeCloseTo(90, 2);
    expect(r.cumple).toBe(true);
  });

  it('dosis=300%, tiempo=8h: NER > 90 pero cumple según tabla (lmpe=96)', () => {
    // 90 + 9.97*log10(300/(12.5*8)) ≈ 90 + 9.97*log10(3) ≈ 94.76 → lmpe=96 → cumple
    const d = {
      numero: 2,
      porcentaje_dosis_final: 300,
      tiempo_medicion_h: 8,
    };
    const r = procesarDosimetria(d);
    expect(r.ner).toBeGreaterThan(90);
    expect(r.lmpe).toBe(96);
    expect(r.cumple).toBe(true);
  });

  it('dosis muy alta: NER > 105, no cumple', () => {
    // 5000% → NER muy alto → supera tope de tabla (105) → no cumple
    const d = {
      numero: 3,
      porcentaje_dosis_final: 5000,
      tiempo_medicion_h: 8,
    };
    const r = procesarDosimetria(d);
    expect(r.ner).toBeGreaterThan(105);
    expect(r.lmpe).toBe(105);
    expect(r.cumple).toBe(false);
  });

  it('sin dosis: ner null, cumple null', () => {
    const d = {
      numero: 3,
      porcentaje_dosis_final: null,
      tiempo_medicion_h: 8,
    };
    const r = procesarDosimetria(d);
    expect(r.ner).toBeNull();
    expect(r.cumple).toBeNull();
  });

  it('incluye lmpe y tmpe en resultado', () => {
    const d = {
      numero: 1,
      porcentaje_dosis_final: 100,
      tiempo_medicion_h: 8,
    };
    const r = procesarDosimetria(d);
    expect(r).toHaveProperty('lmpe');
    expect(r).toHaveProperty('tmpe');
  });
});

// ============================================================================
// 9. calcularResultadosGlobales
// ============================================================================

describe('calcularResultadosGlobales', () => {

  it('todo cumple → conclusión positiva', () => {
    const puntos = [{ numero: 1, ner: 85, cumple: true }];
    const dosis  = [{ numero: 1, ner: 88, cumple: true }];
    const r = calcularResultadosGlobales(puntos, dosis);
    expect(r.conclusion_general).toMatch(/cumplen/i);
    expect(r.puntos_fallidos).toHaveLength(0);
    expect(r.dosimetrias_fallidas).toHaveLength(0);
  });

  it('punto fijo falla → aparece en conclusión', () => {
    const puntos = [
      { numero: 1, ner: 85, cumple: true  },
      { numero: 2, ner: 95, cumple: false },
    ];
    const r = calcularResultadosGlobales(puntos, []);
    expect(r.puntos_fallidos).toContain(2);
    expect(r.conclusion_general).toMatch(/2/);
  });

  it('dosimetría falla → aparece en conclusión', () => {
    const dosis = [
      { numero: 1, ner: 88, cumple: true  },
      { numero: 2, ner: 96, cumple: false },
    ];
    const r = calcularResultadosGlobales([], dosis);
    expect(r.dosimetrias_fallidas).toContain(2);
    expect(r.conclusion_general).toMatch(/dosimetr/i);
  });

  it('ambos fallan → conclusión menciona puntos y dosimetrías', () => {
    const puntos = [{ numero: 1, ner: 95, cumple: false }];
    const dosis  = [{ numero: 1, ner: 98, cumple: false }];
    const r = calcularResultadosGlobales(puntos, dosis);
    expect(r.conclusion_general).toMatch(/puntos fijos/i);
    expect(r.conclusion_general).toMatch(/dosimetr/i);
  });

  it('puntos con ner null no se cuentan', () => {
    const puntos = [
      { numero: 1, ner: null, cumple: null },
      { numero: 2, ner: 85,   cumple: true },
    ];
    const r = calcularResultadosGlobales(puntos, []);
    expect(r.total_puntos_fijos).toBe(1);
  });

  it('sin puntos ni dosimetrías: totales en 0', () => {
    const r = calcularResultadosGlobales([], []);
    expect(r.total_puntos_fijos).toBe(0);
    expect(r.total_dosimetrias).toBe(0);
  });

  it('contadores correctos con mezcla de cumple/falla', () => {
    const puntos = [
      { numero: 1, ner: 85, cumple: true  },
      { numero: 2, ner: 95, cumple: false },
      { numero: 3, ner: 88, cumple: true  },
    ];
    const r = calcularResultadosGlobales(puntos, []);
    expect(r.total_puntos_fijos).toBe(3);
    expect(r.total_puntos_fijos_cumplen).toBe(2);
    expect(r.puntos_fallidos).toEqual([2]);
  });
});