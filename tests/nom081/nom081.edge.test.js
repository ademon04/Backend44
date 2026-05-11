'use strict';


const request = require('supertest');
const app     = require('../../App');
// ============================================================================
// NOM-081 — Edge Cases (unitarios del service)
//
// Correr solo este archivo:
//   npx jest tests/nom081/nom081.edge.test.js
// ============================================================================

const {
  calcularN50,
  calcularDesviacionEstandar,
  calcularN10,
  calcularNEQPunto,
  calcularNEQGeneral,
  calcularEstadisticasPunto,
  calcularPromediosPuntos,
  calcularCe,
  calcularDelta50,
  calcularCf,
  calcularNPrima50,
  calcularNPrimaPrimaFf,
  calcularPeriodo,
  obtenerLimites,
  evaluarCumplimiento,
  calcularIncertidumbre,
  calcularMuestreoNOM081,
  LIMITES_POR_ZONA,
  FACTOR_N10,
  FACTOR_CE,
} = require('../../src/modules/nom081/service');

// ============================================================================
// Helpers
// ============================================================================

/** Genera un arreglo de N lecturas con valor fijo */
function lecturasIguales(valor, n = 36) {
  return Array(n).fill(valor);
}

/** Genera 36 lecturas con variación mínima alrededor de un centro */
function lecturas36(centro, variacion = 2) {
  return Array.from({ length: 36 }, (_, i) =>
    parseFloat((centro + (i % 2 === 0 ? variacion : -variacion)).toFixed(1))
  );
}

/** Objeto de puntos con 36 lecturas en cada uno */
function puntosConLecturas(valor) {
  return {
    puntoA: { lecturas: lecturasIguales(valor) },
    puntoB: { lecturas: lecturasIguales(valor) },
    puntoC: { lecturas: lecturasIguales(valor) },
    puntoD: { lecturas: lecturasIguales(valor) },
    puntoE: { lecturas: lecturasIguales(valor) },
  };
}

// ============================================================================
// 1. calcularN50
// ============================================================================

describe('calcularN50', () => {

  it('promedio simple de lecturas iguales', () => {
    expect(calcularN50(lecturasIguales(60))).toBe(60);
  });

  it('promedio correcto con valores mixtos', () => {
    // (58 + 60 + 62) / 3 = 60
    expect(calcularN50([58, 60, 62])).toBeCloseTo(60, 4);
  });

  it('retorna 0 con arreglo vacío', () => {
    expect(calcularN50([])).toBe(0);
  });

  it('retorna 0 con null', () => {
    expect(calcularN50(null)).toBe(0);
  });

  it('funciona con una sola lectura', () => {
    expect(calcularN50([55])).toBe(55);
  });

  it('resultado tiene hasta 6 decimales (toFixed(6))', () => {
    const r = calcularN50([58.1, 60.3, 61.7]);
    expect(r.toString().split('.')[1]?.length).toBeLessThanOrEqual(6);
  });
});

// ============================================================================
// 2. calcularDesviacionEstandar
// ============================================================================

describe('calcularDesviacionEstandar', () => {

  it('retorna 0 con lecturas idénticas', () => {
    const lecturas = lecturasIguales(60);
    expect(calcularDesviacionEstandar(lecturas, 60)).toBe(0);
  });

  it('retorna 0 con menos de 2 lecturas', () => {
    expect(calcularDesviacionEstandar([60], 60)).toBe(0);
  });

  it('retorna 0 con arreglo vacío', () => {
    expect(calcularDesviacionEstandar([], 60)).toBe(0);
  });

  it('usa divisor n-1 (muestral), no n (poblacional)', () => {
    // Con [58, 62], n50=60: suma cuadrados = 4+4=8, s = sqrt(8/1) = 2.828...
    const s = calcularDesviacionEstandar([58, 62], 60);
    expect(s).toBeCloseTo(2.828427, 4);
  });

  it('resultado positivo con lecturas variables', () => {
    const lecturas = lecturas36(60, 3);
    const n50 = calcularN50(lecturas);
    const s = calcularDesviacionEstandar(lecturas, n50);
    expect(s).toBeGreaterThan(0);
  });

  it('retorna 0 con null', () => {
    expect(calcularDesviacionEstandar(null, 60)).toBe(0);
  });
});

// ============================================================================
// 3. calcularN10
// ============================================================================

describe('calcularN10', () => {

  it('N10 = N50 + 1.2817 * sigma', () => {
    // 60 + 1.2817 * 2 = 62.5634
    expect(calcularN10(60, 2)).toBeCloseTo(62.5634, 4);
  });

  it('N10 === N50 cuando sigma es 0', () => {
    expect(calcularN10(60, 0)).toBe(60);
  });

  it('usa el FACTOR_N10 correcto (1.2817)', () => {
    expect(FACTOR_N10).toBe(1.2817);
  });

  it('resultado tiene hasta 6 decimales', () => {
    const r = calcularN10(58.3, 1.5);
    expect(r.toString().split('.')[1]?.length).toBeLessThanOrEqual(6);
  });
});

// ============================================================================
// 4. calcularNEQPunto — divisor n-1
// ============================================================================

describe('calcularNEQPunto', () => {

  it('retorna 0 con arreglo vacío', () => {
    expect(calcularNEQPunto([])).toBe(0);
  });

  it('retorna 0 con null', () => {
    expect(calcularNEQPunto(null)).toBe(0);
  });

  it('con lecturas idénticas de 60 dB y 36 muestras: NEQ ≈ 60 + 10*log(36/35)', () => {
    // sumaDecibeles = 36 * 10^6 = 36000000
    // NEQ = 10 * log10(36000000 / 35) = 10 * log10(1028571.4) ≈ 60.12
    const neq = calcularNEQPunto(lecturasIguales(60, 36));
    expect(neq).toBeCloseTo(60.12, 1);
  });

  it('usa divisor n-1, no n — con 2 lecturas iguales: NEQ = 10*log10(2*10^6/1)', () => {
    // sumaDecibeles = 2 * 10^(60/10) = 2000000
    // NEQ = 10 * log10(2000000/1) ≈ 63.01
    const neq = calcularNEQPunto([60, 60]);
    expect(neq).toBeCloseTo(63.01, 1);
  });

  it('NEQ mayor que N50 cuando hay variación (energía adicional)', () => {
    const lecturas = lecturas36(60, 5);
    const n50 = calcularN50(lecturas);
    const neq = calcularNEQPunto(lecturas);
    expect(neq).toBeGreaterThan(n50);
  });

  it('resultado tiene hasta 6 decimales', () => {
    const r = calcularNEQPunto(lecturasIguales(55, 36));
    expect(r.toString().split('.')[1]?.length).toBeLessThanOrEqual(6);
  });
});

// ============================================================================
// 5. calcularNEQGeneral
// ============================================================================

describe('calcularNEQGeneral', () => {

  it('retorna 0 si no hay puntos válidos', () => {
    expect(calcularNEQGeneral({})).toBe(0);
  });

  it('promedio energético de 5 puntos iguales = mismo valor', () => {
    // Si todos los NEQ son iguales, el promedio energético = ese mismo valor
    const puntosCalc = {
      puntoA: { neq: 60 },
      puntoB: { neq: 60 },
      puntoC: { neq: 60 },
      puntoD: { neq: 60 },
      puntoE: { neq: 60 },
    };
    expect(calcularNEQGeneral(puntosCalc)).toBeCloseTo(60, 4);
  });

  it('promedio energético es mayor que el promedio aritmético con valores desiguales', () => {
    const puntosCalc = {
      puntoA: { neq: 50 },
      puntoB: { neq: 70 },
      puntoC: { neq: 50 },
      puntoD: { neq: 50 },
      puntoE: { neq: 50 },
    };
    const neqGeneral = calcularNEQGeneral(puntosCalc);
    const promedioArit = (50 + 70 + 50 + 50 + 50) / 5; // 54
    expect(neqGeneral).toBeGreaterThan(promedioArit);
  });

  it('ignora puntos null', () => {
    const puntosCalc = {
      puntoA: { neq: 60 },
      puntoB: null,
      puntoC: { neq: 60 },
      puntoD: null,
      puntoE: { neq: 60 },
    };
    // Solo 3 puntos válidos — promedio energético de 3 iguales = 60
    expect(calcularNEQGeneral(puntosCalc)).toBeCloseTo(60, 4);
  });

  it('ignora puntos sin propiedad neq', () => {
    const puntosCalc = {
      puntoA: { neq: 60 },
      puntoB: { n50: 60 }, // sin neq
      puntoC: { neq: 60 },
      puntoD: { neq: 60 },
      puntoE: { neq: 60 },
    };
    expect(calcularNEQGeneral(puntosCalc)).toBeCloseTo(60, 4);
  });
});

// ============================================================================
// 6. calcularCe
// ============================================================================

describe('calcularCe', () => {

  it('Ce = 0.9023 * sigma', () => {
    // 0.9023 * 2 = 1.8046
    expect(calcularCe(2)).toBeCloseTo(1.8046, 4);
  });

  it('Ce = 0 cuando sigma = 0', () => {
    expect(calcularCe(0)).toBe(0);
  });

  it('usa FACTOR_CE correcto (0.9023)', () => {
    expect(FACTOR_CE).toBe(0.9023);
  });

  it('Ce siempre positivo para sigma positivo', () => {
    expect(calcularCe(3.5)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 7. calcularDelta50
// ============================================================================

describe('calcularDelta50', () => {

  it('diferencia simple: fuente - fondo', () => {
    expect(calcularDelta50(65, 60)).toBeCloseTo(5, 4);
  });

  it('puede ser negativo si fondo > fuente', () => {
    expect(calcularDelta50(58, 62)).toBeCloseTo(-4, 4);
  });

  it('retorna 0 cuando fuente === fondo', () => {
    expect(calcularDelta50(60, 60)).toBe(0);
  });
});

// ============================================================================
// 8. calcularCf — límite crítico en 0.75 dB
// ============================================================================

describe('calcularCf — límite 0.75 dB', () => {

  it('retorna null si delta50 <= 0.75 (fuente no emite nivel sonoro)', () => {
    expect(calcularCf(0.75)).toBeNull();
  });

  it('retorna null si delta50 = 0', () => {
    expect(calcularCf(0)).toBeNull();
  });

  it('retorna null si delta50 negativo', () => {
    expect(calcularCf(-1)).toBeNull();
  });

  it('retorna valor numérico si delta50 > 0.75', () => {
    const cf = calcularCf(5);
    expect(cf).not.toBeNull();
    expect(typeof cf).toBe('number');
  });

  it('Cf típico con delta50 = 5: fórmula -(5+9) + 3*sqrt(4*5-3)', () => {
    // -(14) + 3*sqrt(17) = -14 + 12.3693 = -1.6307
    const cf = calcularCf(5);
    expect(cf).toBeCloseTo(-1.6307, 3);
  });

  it('Cf con delta50 = 1 (justo sobre el límite)', () => {
    // -(1+9) + 3*sqrt(4*1-3) = -10 + 3*1 = -7
    const cf = calcularCf(1);
    expect(cf).toBeCloseTo(-7, 4);
  });

  it('Cf es siempre negativo (corrige hacia abajo)', () => {
    [1, 2, 5, 10, 20].forEach(d => {
      const cf = calcularCf(d);
      if (cf !== null) expect(cf).toBeLessThan(0);
    });
  });
});

// ============================================================================
// 9. calcularNPrima50
// ============================================================================

describe('calcularNPrima50', () => {

  it("N'50 = N50_fuente + Ce", () => {
    expect(calcularNPrima50(60, 1.8046)).toBeCloseTo(61.8046, 4);
  });

  it("N'50 === N50 cuando Ce = 0", () => {
    expect(calcularNPrima50(65, 0)).toBe(65);
  });
});

// ============================================================================
// 10. calcularNPrimaPrimaFf
// ============================================================================

describe("calcularNPrimaPrimaFf — N''ff", () => {

  it('retorna nivel null cuando delta50 <= 0.75', () => {
    const r = calcularNPrimaPrimaFf(62, 61, -3, 0.5);
    expect(r.nivel).toBeNull();
    expect(r.observacion).toBe('No emite nivel sonoro');
  });

  it('usa max(N\'50, NEQ) antes de aplicar Cf', () => {
    // N'50=62, NEQ=65 → nff=65, Cf=-2 → nivel=63
    const r = calcularNPrimaPrimaFf(62, 65, -2, 5);
    expect(r.nivel).toBeCloseTo(63, 4);
    expect(r.observacion).toBeNull();
  });

  it('usa N\'50 cuando es mayor que NEQ', () => {
    // N'50=68, NEQ=65 → nff=68, Cf=-2 → nivel=66
    const r = calcularNPrimaPrimaFf(68, 65, -2, 5);
    expect(r.nivel).toBeCloseTo(66, 4);
  });

  it('Cf negativo reduce el nivel final', () => {
    const r1 = calcularNPrimaPrimaFf(65, 64, 0, 5);   // Cf=0
    const r2 = calcularNPrimaPrimaFf(65, 64, -3, 5);  // Cf=-3
    expect(r2.nivel).toBeLessThan(r1.nivel);
  });
});

// ============================================================================
// 11. obtenerLimites
// ============================================================================

describe('obtenerLimites', () => {

  it('zona Industrial y Comercial: diurno=68, nocturno=65', () => {
    const l = obtenerLimites('Industrial y Comercial');
    expect(l.diurno).toBe(68);
    expect(l.nocturno).toBe(65);
  });

  it('zona Residencial: diurno=55, nocturno=50', () => {
    const l = obtenerLimites('Residencial (Exteriores)');
    expect(l.diurno).toBe(55);
    expect(l.nocturno).toBe(50);
  });

  it('zona Escuelas: nocturno es null (no aplica)', () => {
    const l = obtenerLimites('Escuelas (Áreas Exteriores de Juego)');
    expect(l.nocturno).toBeNull();
  });

  it('zona desconocida usa Industrial y Comercial como default', () => {
    const l = obtenerLimites('Zona que no existe');
    expect(l.diurno).toBe(68);
  });

  it('zona Ceremonias: diurno=100', () => {
    const l = obtenerLimites('Ceremonias, Festivales y Eventos de Entretenimiento.');
    expect(l.diurno).toBe(100);
  });
});

// ============================================================================
// 12. evaluarCumplimiento
// ============================================================================

describe('evaluarCumplimiento', () => {

  it('cumple exactamente en el límite', () => {
    expect(evaluarCumplimiento(68, 68)).toBe(true);
  });

  it('no cumple con 68.001 cuando límite es 68', () => {
    expect(evaluarCumplimiento(68.001, 68)).toBe(false);
  });

  it('cumple automáticamente cuando nivel es null (delta50 <= 0.75)', () => {
    expect(evaluarCumplimiento(null, 68)).toBe(true);
  });

  it('no cumple cuando nivel supera el límite', () => {
    expect(evaluarCumplimiento(70, 68)).toBe(false);
  });
});

// ============================================================================
// 13. calcularIncertidumbre
// ============================================================================

describe('calcularIncertidumbre', () => {

  it('tipo porcentaje: UE = (incertidumbre/100) * nivelFinal', () => {
    const sonometro = { incertidumbre_global: 0.3, tipo_incertidumbre: 'porcentaje' };
    // 0.3/100 * 50.170861 ≈ 0.150513
    const ue = calcularIncertidumbre(50.170861, sonometro);
    expect(ue).toBeCloseTo(0.150513, 4);
  });

  it('tipo db: UE = valor fijo en dB', () => {
    const sonometro = { incertidumbre_global: 1.5, tipo_incertidumbre: 'db' };
    expect(calcularIncertidumbre(65, sonometro)).toBeCloseTo(1.5, 4);
  });

  it('retorna null si sonometro es null', () => {
    expect(calcularIncertidumbre(65, null)).toBeNull();
  });

  it('retorna null si nivelFinal es null', () => {
    const sonometro = { incertidumbre_global: 0.3, tipo_incertidumbre: 'porcentaje' };
    expect(calcularIncertidumbre(null, sonometro)).toBeNull();
  });
});

// ============================================================================
// 14. calcularPeriodo — integración
// ============================================================================

describe('calcularPeriodo — integración', () => {

  it('retorna error si fuente tiene N50=0 (sin datos)', () => {
    const r = calcularPeriodo({ puntoA: { lecturas: [] } }, puntosConLecturas(60));
    expect(r.error).toBeDefined();
  });

  it('retorna error si fondo tiene N50=0', () => {
    const r = calcularPeriodo(puntosConLecturas(65), { puntoA: { lecturas: [] } });
    expect(r.error).toBeDefined();
  });

  it('delta50 <= 0.75 → nivelFinal null (fuente no emite nivel sonoro)', () => {
    // fuente y fondo casi iguales
    const fuente = puntosConLecturas(60.3);
    const fondo  = puntosConLecturas(60.0);
    const r = calcularPeriodo(fuente, fondo);
    // delta50 = 0.3 <= 0.75
    expect(r.nivelFinal).toBeNull();
    expect(r.observacion).toBe('No emite nivel sonoro');
  });

  it('fuente claramente mayor que fondo → produce nivel final válido', () => {
    const fuente = puntosConLecturas(70);
    const fondo  = puntosConLecturas(55);
    const r = calcularPeriodo(fuente, fondo);
    expect(r.nivelFinal).not.toBeNull();
    expect(typeof r.nivelFinal).toBe('number');
  });

  it('estructura de respuesta contiene fuente, fondo, ce, delta50, cf, nPrima50, neqGeneral', () => {
    const fuente = puntosConLecturas(70);
    const fondo  = puntosConLecturas(55);
    const r = calcularPeriodo(fuente, fondo);
    expect(r).toHaveProperty('fuente');
    expect(r).toHaveProperty('fondo');
    expect(r).toHaveProperty('ce');
    expect(r).toHaveProperty('delta50');
    expect(r).toHaveProperty('nPrima50');
    expect(r).toHaveProperty('neqGeneral');
  });
});

// ============================================================================
// 15. calcularMuestreoNOM081 — función principal
// ============================================================================

describe('calcularMuestreoNOM081 — función principal', () => {

  const datosBase = {
    zona_tipo: 'Industrial y Comercial',
    mediciones: {
      diurno: {
        fuente: puntosConLecturas(70),
        fondo:  puntosConLecturas(55),
      },
    },
  };

  it('estructura de respuesta: zona, diurno, nocturno, conclusion', () => {
    const r = calcularMuestreoNOM081(datosBase);
    expect(r).toHaveProperty('zona');
    expect(r).toHaveProperty('diurno');
    expect(r).toHaveProperty('nocturno');
    expect(r).toHaveProperty('conclusion');
  });

  it('zona Industrial: límite diurno 68, nocturno 65', () => {
    const r = calcularMuestreoNOM081(datosBase);
    expect(r.zona.diurno).toBe(68);
    expect(r.zona.nocturno).toBe(65);
  });

  it('nocturno es null si no se proveen mediciones nocturnas', () => {
    const r = calcularMuestreoNOM081(datosBase);
    expect(r.nocturno).toBeNull();
  });

  it('fuente 55 dB < límite 68: diurno cumple', () => {
    const datos = {
      zona_tipo: 'Industrial y Comercial',
      mediciones: {
        diurno: {
          fuente: puntosConLecturas(60),
          fondo:  puntosConLecturas(45),
        },
      },
    };
    const r = calcularMuestreoNOM081(datos);
    expect(r.diurno.cumple).toBe(true);
  });

  it('fuente muy alta > límite 68: diurno no cumple', () => {
    const datos = {
      zona_tipo: 'Industrial y Comercial',
      mediciones: {
        diurno: {
          fuente: puntosConLecturas(85),
          fondo:  puntosConLecturas(55),
        },
      },
    };
    const r = calcularMuestreoNOM081(datos);
    expect(r.diurno.cumple).toBe(false);
  });

  it('conclusión correcta cuando solo diurno falla', () => {
    const datos = {
      zona_tipo: 'Industrial y Comercial',
      mediciones: {
        diurno: {
          fuente: puntosConLecturas(85),
          fondo:  puntosConLecturas(55),
        },
        nocturno: {
          fuente: puntosConLecturas(60),
          fondo:  puntosConLecturas(45),
        },
      },
    };
    const r = calcularMuestreoNOM081(datos);
    expect(r.conclusion.diurno_cumple).toBe(false);
    expect(r.conclusion.nocturno_cumple).toBe(true);
    expect(r.conclusion.texto).toMatch(/diurno/i);
  });

  it('conclusión correcta cuando ambos períodos cumplen', () => {
    const datos = {
      zona_tipo: 'Industrial y Comercial',
      mediciones: {
        diurno: {
          fuente: puntosConLecturas(60),
          fondo:  puntosConLecturas(45),
        },
        nocturno: {
          fuente: puntosConLecturas(58),
          fondo:  puntosConLecturas(44),
        },
      },
    };
    const r = calcularMuestreoNOM081(datos);
    expect(r.conclusion.diurno_cumple).toBe(true);
    expect(r.conclusion.nocturno_cumple).toBe(true);
  });

  it('zona Escuelas: nocturno no se calcula aunque se provean datos (limites.nocturno === null)', () => {
    const datos = {
      zona_tipo: 'Escuelas (Áreas Exteriores de Juego)',
      mediciones: {
        diurno: {
          fuente: puntosConLecturas(60),
          fondo:  puntosConLecturas(45),
        },
        nocturno: {
          fuente: puntosConLecturas(58),
          fondo:  puntosConLecturas(44),
        },
      },
    };
    const r = calcularMuestreoNOM081(datos);
    expect(r.nocturno).toBeNull();
  });

  it('con sonometro incluye incertidumbre en el resultado', () => {
    const datos = {
      ...datosBase,
      sonometro: { incertidumbre_global: 0.3, tipo_incertidumbre: 'porcentaje' },
    };
    const r = calcularMuestreoNOM081(datos);
    if (r.diurno && r.diurno.nivelFinal !== null) {
      expect(r.diurno.incertidumbre).not.toBeNull();
      expect(typeof r.diurno.incertidumbre).toBe('number');
    }
  });

  it('sin mediciones: diurno y nocturno son null', () => {
    const datos = {
      zona_tipo: 'Industrial y Comercial',
      mediciones: {},
    };
    const r = calcularMuestreoNOM081(datos);
    expect(r.diurno).toBeNull();
    expect(r.nocturno).toBeNull();
  });

  it('conclusión ambos cumplen cuando mediciones están vacías (default true)', () => {
    const datos = {
      zona_tipo: 'Industrial y Comercial',
      mediciones: {},
    };
    const r = calcularMuestreoNOM081(datos);
    expect(r.conclusion.diurno_cumple).toBe(true);
    expect(r.conclusion.nocturno_cumple).toBe(true);
  });
});