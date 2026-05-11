'use strict';

const request = require('supertest');
const app     = require('../../App');

const {
  calcularMediana,
  calcularUE,
  obtenerLimite,
  evaluarCumplimiento,
  evaluarContinuidad,
  procesarPozo,
  procesarContinuidad,
  calcularResultadosGlobales,
  verificarCriterioTerrometro,
  LIMITE_PARARRAYOS,
  LIMITE_ELECTRODO,
  FACTOR_UE,
} = require('../../src/modules/nom022/service');

// ============================================================================
// 1. calcularMediana
// ============================================================================

describe('calcularMediana', () => {

  it('mediana de arreglo impar: [1,3,5] → 3', () => {
    expect(calcularMediana([1, 3, 5])).toBe(3);
  });

  it('mediana de arreglo par: [1,2,3,4] → 2.5', () => {
    expect(calcularMediana([1, 2, 3, 4])).toBeCloseTo(2.5, 4);
  });

  it('ordena antes de calcular (no asume orden)', () => {
    expect(calcularMediana([5, 1, 3])).toBe(3);
  });

  it('retorna null con arreglo vacío', () => {
    expect(calcularMediana([])).toBeNull();
  });

  it('retorna null con null', () => {
    expect(calcularMediana(null)).toBeNull();
  });

  it('funciona con un solo valor', () => {
    expect(calcularMediana([8.5])).toBe(8.5);
  });

  it('7 lecturas típicas de pozo (1m,4m,7m,10m,13m,16m,19m)', () => {
    // Mediana de 7 valores = el 4to ordenado
    const lecturas = [5.2, 5.1, 4.9, 5.0, 5.3, 5.1, 5.0];
    const r = calcularMediana(lecturas);
    expect(r).toBe(5.1); // [4.9,5.0,5.0,5.1,5.1,5.2,5.3] → pos 3 = 5.1
  });

  it('resultado tiene hasta 6 decimales', () => {
    const r = calcularMediana([3.1415926, 2.7182818]);
    expect(r.toString().split('.')[1]?.length).toBeLessThanOrEqual(6);
  });

  it('no muta el arreglo original', () => {
    const original = [5, 3, 1];
    calcularMediana(original);
    expect(original).toEqual([5, 3, 1]);
  });
});

// ============================================================================
// 2. calcularUE
// ============================================================================

describe('calcularUE', () => {

  it('UE = resultado × 0.0053', () => {
    // 10 × 0.0053 = 0.053
    expect(calcularUE(10)).toBeCloseTo(0.053, 4);
  });

  it('FACTOR_UE es 0.0053', () => {
    expect(FACTOR_UE).toBe(0.0053);
  });

  it('retorna null si resultado es null', () => {
    expect(calcularUE(null)).toBeNull();
  });

  it('retorna null si resultado es undefined', () => {
    expect(calcularUE(undefined)).toBeNull();
  });

  it('UE de 25 ohms (límite electrodo)', () => {
    // 25 × 0.0053 = 0.1325
    expect(calcularUE(25)).toBeCloseTo(0.1325, 4);
  });

  it('UE siempre positiva para valores positivos', () => {
    expect(calcularUE(5)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 3. obtenerLimite
// ============================================================================

describe('obtenerLimite', () => {

  it('Pararrayos → 10 ohms', () => {
    expect(obtenerLimite('Pararrayos')).toBe(10);
    expect(LIMITE_PARARRAYOS).toBe(10);
  });

  it('cualquier otro valor → 25 ohms (electrodo)', () => {
    expect(obtenerLimite('Electrodo')).toBe(25);
    expect(obtenerLimite('otro')).toBe(25);
    expect(obtenerLimite(null)).toBe(25);
    expect(obtenerLimite(undefined)).toBe(25);
    expect(LIMITE_ELECTRODO).toBe(25);
  });

  it('case sensitive: "pararrayos" minúsculas → 25 (no es Pararrayos)', () => {
    expect(obtenerLimite('pararrayos')).toBe(25);
  });
});

// ============================================================================
// 4. evaluarCumplimiento — sin UE en regla de decisión
// ============================================================================

describe('evaluarCumplimiento', () => {

  it('cumple exactamente en el límite (<=)', () => {
    expect(evaluarCumplimiento(10, 10)).toBe(true);
    expect(evaluarCumplimiento(25, 25)).toBe(true);
  });

  it('no cumple con 10.001 cuando límite es 10', () => {
    expect(evaluarCumplimiento(10.001, 10)).toBe(false);
  });

  it('cumple con valor menor al límite', () => {
    expect(evaluarCumplimiento(8, 10)).toBe(true);
  });

  it('retorna null si resultado es null', () => {
    expect(evaluarCumplimiento(null, 10)).toBeNull();
  });

  it('retorna null si resultado es undefined', () => {
    expect(evaluarCumplimiento(undefined, 10)).toBeNull();
  });

  it('NOM-022 no aplica UE en la regla de decisión — 9.95 cumple límite 10', () => {
    // A diferencia de NOM-025 (ILAC-G8 con UE), aquí no se resta UE
    expect(evaluarCumplimiento(9.95, 10)).toBe(true);
  });
});

// ============================================================================
// 5. evaluarContinuidad
// ============================================================================

describe('evaluarContinuidad', () => {

  it('retorna true si continuidad_ohm > 0', () => {
    expect(evaluarContinuidad(0.5)).toBe(true);
  });

  it('retorna false si continuidad_ohm === 0', () => {
    expect(evaluarContinuidad(0)).toBe(false);
  });

  it('retorna null si es null', () => {
    expect(evaluarContinuidad(null)).toBeNull();
  });

  it('retorna null si es undefined', () => {
    expect(evaluarContinuidad(undefined)).toBeNull();
  });

  it('valor negativo retorna false (> 0 es false)', () => {
    expect(evaluarContinuidad(-1)).toBe(false);
  });
});

// ============================================================================
// 6. procesarPozo — integración
// ============================================================================

describe('procesarPozo', () => {

  const lecturas7 = (val) => Array.from({ length: 7 }, (_, i) =>
    ({ valor_ohm: val + (i * 0.1 - 0.3) }) // variación pequeña
  );

  it('pozo Pararrayos con resultado < 10: cumple', () => {
    const pozo = {
      numero: 1,
      sistema: 'Pararrayos',
      lecturas: [{ valor_ohm: 5 }, { valor_ohm: 6 }, { valor_ohm: 7 }],
    };
    const r = procesarPozo(pozo);
    expect(r.resultado_ohm).toBe(6);
    expect(r.limite_ohm).toBe(10);
    expect(r.cumple).toBe(true);
  });

  it('pozo Pararrayos con resultado > 10: no cumple', () => {
    const pozo = {
      numero: 2,
      sistema: 'Pararrayos',
      lecturas: [{ valor_ohm: 11 }, { valor_ohm: 12 }, { valor_ohm: 13 }],
    };
    const r = procesarPozo(pozo);
    expect(r.cumple).toBe(false);
    expect(r.limite_ohm).toBe(10);
  });

  it('pozo Electrodo con resultado < 25: cumple', () => {
    const pozo = {
      numero: 3,
      sistema: 'Electrodo',
      lecturas: [{ valor_ohm: 20 }, { valor_ohm: 22 }, { valor_ohm: 24 }],
    };
    const r = procesarPozo(pozo);
    expect(r.cumple).toBe(true);
    expect(r.limite_ohm).toBe(25);
  });

  it('pozo sin lecturas: resultado_ohm null, cumple null', () => {
    const pozo = { numero: 1, sistema: 'Electrodo', lecturas: [] };
    const r = procesarPozo(pozo);
    expect(r.resultado_ohm).toBeNull();
    expect(r.cumple).toBeNull();
  });

  it('filtra lecturas con valor_ohm null', () => {
    const pozo = {
      numero: 1,
      sistema: 'Electrodo',
      lecturas: [{ valor_ohm: 10 }, { valor_ohm: null }, { valor_ohm: 20 }],
    };
    const r = procesarPozo(pozo);
    // Mediana de [10, 20] = 15
    expect(r.resultado_ohm).toBe(15);
  });

  it('calcula UE correctamente en el pozo', () => {
    const pozo = {
      numero: 1,
      sistema: 'Electrodo',
      lecturas: [{ valor_ohm: 10 }],
    };
    const r = procesarPozo(pozo);
    expect(r.ue_ohm).toBeCloseTo(10 * 0.0053, 4);
  });

  it('pozo exactamente en límite de pararrayos (10 ohms): cumple', () => {
    const pozo = {
      numero: 1,
      sistema: 'Pararrayos',
      lecturas: [{ valor_ohm: 10 }],
    };
    const r = procesarPozo(pozo);
    expect(r.cumple).toBe(true);
  });
});

// ============================================================================
// 7. verificarCriterioTerrometro
// ============================================================================

describe('verificarCriterioTerrometro', () => {

  const verificacionOk = {
    resistencia_1ohm_inicial:   1.0,  resistencia_1ohm_final:   1.05,  // diff=0.05 ≤ 0.1 ✓
    resistencia_10ohm_inicial: 10.0,  resistencia_10ohm_final: 10.5,   // diff=0.5  ≤ 1   ✓
    resistencia_22ohm_inicial: 22.0,  resistencia_22ohm_final: 23.5,   // diff=1.5  ≤ 2   ✓
    resistencia_30ohm_inicial: 30.0,  resistencia_30ohm_final: 32.5,   // diff=2.5  ≤ 3   ✓
  };

  it('cumple_criterio true cuando todas las resistencias están en tolerancia', () => {
    const r = verificarCriterioTerrometro(verificacionOk);
    expect(r.cumple_criterio).toBe(true);
    expect(r.cumple_1ohm).toBe(true);
    expect(r.cumple_10ohm).toBe(true);
    expect(r.cumple_22ohm).toBe(true);
    expect(r.cumple_30ohm).toBe(true);
  });

  it('falla si resistencia de 1 ohm supera tolerancia de 0.1', () => {
    const r = verificarCriterioTerrometro({
      ...verificacionOk,
      resistencia_1ohm_final: 1.2, // diff=0.2 > 0.1
    });
    expect(r.cumple_1ohm).toBe(false);
    expect(r.cumple_criterio).toBe(false);
  });

  it('falla si resistencia de 10 ohms supera tolerancia de 1', () => {
    const r = verificarCriterioTerrometro({
      ...verificacionOk,
      resistencia_10ohm_final: 11.5, // diff=1.5 > 1
    });
    expect(r.cumple_10ohm).toBe(false);
    expect(r.cumple_criterio).toBe(false);
  });

  it('falla si resistencia de 22 ohms supera tolerancia de 2', () => {
    const r = verificarCriterioTerrometro({
      ...verificacionOk,
      resistencia_22ohm_final: 24.5, // diff=2.5 > 2
    });
    expect(r.cumple_22ohm).toBe(false);
    expect(r.cumple_criterio).toBe(false);
  });

  it('falla si resistencia de 30 ohms supera tolerancia de 3', () => {
    const r = verificarCriterioTerrometro({
      ...verificacionOk,
      resistencia_30ohm_final: 33.5, // diff=3.5 > 3
    });
    expect(r.cumple_30ohm).toBe(false);
    expect(r.cumple_criterio).toBe(false);
  });

  it('tolerancia exacta en límite: cumple (usa <=)', () => {
    const r = verificarCriterioTerrometro({
      ...verificacionOk,
      resistencia_1ohm_final: 1.1,  // diff=0.1 exacto ≤ 0.1 ✓
    });
    expect(r.cumple_1ohm).toBe(true);
  });

  it('retorna null para resistencia si inicial es null', () => {
    const r = verificarCriterioTerrometro({
      ...verificacionOk,
      resistencia_1ohm_inicial: null,
    });
    expect(r.cumple_1ohm).toBeNull();
  });

  it('cumple_criterio true cuando algún par es null (null no es false)', () => {
    // null !== false → no bloquea cumple_criterio
    const r = verificarCriterioTerrometro({
      resistencia_1ohm_inicial:   null, resistencia_1ohm_final:   null,
      resistencia_10ohm_inicial: 10.0,  resistencia_10ohm_final: 10.5,
      resistencia_22ohm_inicial: 22.0,  resistencia_22ohm_final: 23.5,
      resistencia_30ohm_inicial: 30.0,  resistencia_30ohm_final: 32.5,
    });
    expect(r.cumple_1ohm).toBeNull();
    expect(r.cumple_criterio).toBe(true); // null !== false
  });

  it('diferencia negativa (final < inicial) también evalúa con Math.abs', () => {
    const r = verificarCriterioTerrometro({
      ...verificacionOk,
      resistencia_10ohm_final: 9.5, // diff = |9.5-10| = 0.5 ≤ 1 ✓
    });
    expect(r.cumple_10ohm).toBe(true);
  });
});

// ============================================================================
// 8. calcularResultadosGlobales
// ============================================================================

describe('calcularResultadosGlobales', () => {

  it('todos los pozos cumplen → conclusión positiva', () => {
    const pozos = [
      { numero: 1, resultado_ohm: 5,  cumple: true },
      { numero: 2, resultado_ohm: 8,  cumple: true },
    ];
    const r = calcularResultadosGlobales(pozos, []);
    expect(r.total_pozos_cumplen).toBe(2);
    expect(r.pozos_fallidos).toHaveLength(0);
    expect(r.conclusion_general).toMatch(/cumplen/i);
  });

  it('un pozo falla → conclusión con número de pozo', () => {
    const pozos = [
      { numero: 1, resultado_ohm: 5,  cumple: true  },
      { numero: 2, resultado_ohm: 30, cumple: false },
    ];
    const r = calcularResultadosGlobales(pozos, []);
    expect(r.pozos_fallidos).toContain(2);
    expect(r.conclusion_general).toMatch(/2/);
    expect(r.conclusion_general).toMatch(/no cumplen/i);
  });

  it('pozos con resultado_ohm null no se cuentan', () => {
    const pozos = [
      { numero: 1, resultado_ohm: null, cumple: null },
      { numero: 2, resultado_ohm: 5,    cumple: true },
    ];
    const r = calcularResultadosGlobales(pozos, []);
    expect(r.total_pozos).toBe(1);
  });

  it('total_continuidades es correcto', () => {
    const continuidades = [{}, {}, {}];
    const r = calcularResultadosGlobales([], continuidades);
    expect(r.total_continuidades).toBe(3);
  });

  it('sin pozos ni continuidades: totales en 0', () => {
    const r = calcularResultadosGlobales([], []);
    expect(r.total_pozos).toBe(0);
    expect(r.total_pozos_cumplen).toBe(0);
    expect(r.pozos_fallidos).toHaveLength(0);
  });

  it('múltiples pozos fallidos: todos aparecen en conclusión', () => {
    const pozos = [
      { numero: 1, resultado_ohm: 30, cumple: false },
      { numero: 2, resultado_ohm: 15, cumple: true  },
      { numero: 3, resultado_ohm: 28, cumple: false },
    ];
    const r = calcularResultadosGlobales(pozos, []);
    expect(r.pozos_fallidos).toContain(1);
    expect(r.pozos_fallidos).toContain(3);
    expect(r.conclusion_general).toMatch(/1/);
    expect(r.conclusion_general).toMatch(/3/);
  });
});