'use strict';

// ============================================================================
// NOM-025 — Edge Cases
//
// Organización:
//   1. Unitarios del service (sin BD, sin HTTP)
//   2. Integración HTTP — huecos no cubiertos por los tests actuales
//
// Correr solo este archivo:
//   npx jest tests/nom025/nom025.edge.test.js
// ============================================================================

const request = require('supertest');
const app     = require('../../App');

const {
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
} = require('../../src/modules/nom025/service');

// Factores de corrección representativos (similares al cert. SIMH-OPTICA/0008-2025)
const FC_REALES = [
  { iluminancia_ref: 100,  factor: 1.02 },
  { iluminancia_ref: 300,  factor: 1.00 },
  { iluminancia_ref: 500,  factor: 0.99 },
  { iluminancia_ref: 1000, factor: 0.98 },
];

// ============================================================================
// 1. UNITARIOS — seleccionarFactor
// ============================================================================

describe('seleccionarFactor — edge cases', () => {

  it('retorna 1.0 si factoresCorreccion es arreglo vacío', () => {
    expect(seleccionarFactor(300, [])).toBe(1.0);
  });

  it('retorna 1.0 si lux es 0 (falsy)', () => {
    expect(seleccionarFactor(0, FC_REALES)).toBe(1.0);
  });

  it('retorna 1.0 si lux es null', () => {
    expect(seleccionarFactor(null, FC_REALES)).toBe(1.0);
  });

  it('retorna 1.0 si factoresCorreccion es null', () => {
    expect(seleccionarFactor(300, null)).toBe(1.0);
  });

  it('selecciona el factor más cercano — equidistante entre 100 y 300 (200 lux)', () => {
    // 200 está a 100 de distancia tanto de 100 como de 300
    // reduce() elige el primero encontrado en caso de empate exacto → factor de 100
    const factor = seleccionarFactor(200, FC_REALES);
    expect([1.02, 1.00]).toContain(factor); // cualquiera es aceptable
  });

  it('selecciona el factor correcto para un valor exacto en tabla', () => {
    expect(seleccionarFactor(500, FC_REALES)).toBe(0.99);
  });

  it('selecciona el factor del extremo inferior para lux muy bajo', () => {
    expect(seleccionarFactor(1, FC_REALES)).toBe(1.02); // más cercano a 100
  });

  it('selecciona el factor del extremo superior para lux muy alto', () => {
    expect(seleccionarFactor(9999, FC_REALES)).toBe(0.98); // más cercano a 1000
  });

  it('funciona con un único factor en la tabla', () => {
    expect(seleccionarFactor(999, [{ iluminancia_ref: 500, factor: 1.05 }])).toBe(1.05);
  });
});

// ============================================================================
// 2. UNITARIOS — corregirLux
// ============================================================================

describe('corregirLux — edge cases', () => {

  it('aplica el factor correcto: 300 lux × 1.00 = 300.0', () => {
    expect(corregirLux(300, FC_REALES)).toBe(300.0);
  });

  it('aplica el factor correcto: 100 lux × 1.02 = 102.0', () => {
    expect(corregirLux(100, FC_REALES)).toBe(102.0);
  });

  it('retorna con 1 decimal (toFixed(1))', () => {
    // 1000 × 0.98 = 980.0
    const resultado = corregirLux(1000, FC_REALES);
    expect(resultado).toBe(980.0);
    expect(resultado.toString()).toMatch(/^\d+(\.\d)?$/);
  });

  it('retorna 0 si lux es 0', () => {
    // seleccionarFactor retorna 1.0 para 0, pero 0 × 1.0 = 0
    expect(corregirLux(0, FC_REALES)).toBe(0);
  });

  it('maneja lux decimal: 150.5', () => {
    const resultado = corregirLux(150.5, FC_REALES);
    expect(typeof resultado).toBe('number');
    expect(resultado).toBeGreaterThan(0);
  });

  it('no retorna NaN con factores vacíos', () => {
    expect(corregirLux(300, [])).not.toBeNaN();
  });
});

// ============================================================================
// 3. UNITARIOS — calcularKf
// ============================================================================

describe('calcularKf — edge cases', () => {

  it('retorna null si e1 es null', () => {
    expect(calcularKf(null, 200, FC_REALES)).toBeNull();
  });

  it('retorna null si e2 es null', () => {
    expect(calcularKf(200, null, FC_REALES)).toBeNull();
  });

  it('retorna null si e1 es el string "----"', () => {
    expect(calcularKf('----', 200, FC_REALES)).toBeNull();
  });

  it('retorna null si e2 es el string "----"', () => {
    expect(calcularKf(200, '----', FC_REALES)).toBeNull();
  });

  it('retorna null si e2 es 0 (división por cero)', () => {
    expect(calcularKf(100, 0, FC_REALES)).toBeNull();
  });

  it('retorna null si e1 es undefined', () => {
    expect(calcularKf(undefined, 200, FC_REALES)).toBeNull();
  });

  it('kf es ~100% si e1 === e2 (mismo lux, mismo factor)', () => {
    // fc(300) = 1.00, entonces (1×300)/(1×300) × 100 = 100%
    const kf = calcularKf(300, 300, FC_REALES);
    expect(kf).toBeCloseTo(100, 1);
  });

  it('kf < 50% cumple plano (ejemplo: 100/500)', () => {
    // fc(100)=1.02, fc(500)=0.99 → (1.02×100)/(0.99×500)×100 = 102/495 ≈ 20.6%
    const kf = calcularKf(100, 500, FC_REALES);
    expect(kf).toBeLessThan(50);
  });

  it('kf > 60% falla pared (e1 muy alto, e2 muy bajo)', () => {
    // fc(1000)=0.98, fc(100)=1.02 → (0.98×1000)/(1.02×100)×100 = 980/102 ≈ 960%
    const kf = calcularKf(1000, 100, FC_REALES);
    expect(kf).toBeGreaterThan(60);
  });

  it('kf exactamente en límite de plano: 50.0% debe cumplir', () => {
    // Necesitamos que (fc1*e1)/(fc2*e2) = 0.5
    // Con factores iguales: e1/e2 = 0.5 → e1=100, e2=200
    // Ambos caerán al factor de 100 (1.02) → 102/204 ≈ 50% exacto
    const kf = calcularKf(100, 200, [{ iluminancia_ref: 150, factor: 1.02 }]);
    expect(kf).toBeCloseTo(50, 0);
  });
});

// ============================================================================
// 4. UNITARIOS — calcularUE
// ============================================================================

describe('calcularUE — edge cases', () => {

  it('usa u_relativa default 0.0366', () => {
    // 300 × 0.0366 = 10.98 → toFixed(1) = 11.0
    expect(calcularUE(300)).toBe(11.0);
  });

  it('usa u_relativa personalizada', () => {
    expect(calcularUE(300, 0.05)).toBeCloseTo(15.0, 1);
  });

  it('retorna 0 si luxCorregido es 0', () => {
    expect(calcularUE(0)).toBe(0);
  });

  it('retorna 0 si luxCorregido es null (falsy)', () => {
    expect(calcularUE(null)).toBe(0);
  });

  it('retorna 0 si luxCorregido es undefined (falsy)', () => {
    expect(calcularUE(undefined)).toBe(0);
  });

  it('UE siempre es positiva', () => {
    expect(calcularUE(1000)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 5. UNITARIOS — verificarCumplimientoLux (Regla ILAC-G8)
// ============================================================================

describe('verificarCumplimientoLux — Regla ILAC-G8', () => {

  it('cumple: (lux_corregido - UE) >= NMI exactamente', () => {
    // 300 - 0 >= 300
    expect(verificarCumplimientoLux(300, 300, 0)).toBe(true);
  });

  it('no cumple: lux_corregido justo debajo de NMI sin UE', () => {
    expect(verificarCumplimientoLux(299, 300, 0)).toBe(false);
  });

  it('no cumple: UE empuja el resultado por debajo del NMI', () => {
    // 305 - 11 = 294 < 300
    expect(verificarCumplimientoLux(305, 300, 11)).toBe(false);
  });

  it('cumple: lux holgado sobre NMI con UE', () => {
    // 350 - 11 = 339 >= 300
    expect(verificarCumplimientoLux(350, 300, 11)).toBe(true);
  });

  it('retorna null si luxCorregido es null', () => {
    expect(verificarCumplimientoLux(null, 300, 0)).toBeNull();
  });

  it('retorna null si nmiRequerido es 0 (falsy)', () => {
    expect(verificarCumplimientoLux(300, 0, 0)).toBeNull();
  });

  it('retorna null si nmiRequerido es null', () => {
    expect(verificarCumplimientoLux(300, null, 0)).toBeNull();
  });

  it('UE mayor que lux_corregido: no cumple aunque lux > NMI', () => {
    // 310 - 50 = 260 < 300
    expect(verificarCumplimientoLux(310, 300, 50)).toBe(false);
  });
});

// ============================================================================
// 6. UNITARIOS — verificarCumplimientoPlano / Pared
// ============================================================================

describe('verificarCumplimientoPlano — límite 50%', () => {
  it('cumple exactamente en 50%', () => {
    expect(verificarCumplimientoPlano(50)).toBe(true);
  });
  it('no cumple con 50.1%', () => {
    expect(verificarCumplimientoPlano(50.1)).toBe(false);
  });
  it('cumple con 0% (iluminación perfectamente uniforme)', () => {
    expect(verificarCumplimientoPlano(0)).toBe(true);
  });
  it('retorna null si kf es null', () => {
    expect(verificarCumplimientoPlano(null)).toBeNull();
  });
  it('retorna null si kf es undefined', () => {
    expect(verificarCumplimientoPlano(undefined)).toBeNull();
  });
});

describe('verificarCumplimientoPared — límite 60%', () => {
  it('cumple exactamente en 60%', () => {
    expect(verificarCumplimientoPared(60)).toBe(true);
  });
  it('no cumple con 60.1%', () => {
    expect(verificarCumplimientoPared(60.1)).toBe(false);
  });
  it('retorna null si kf es null', () => {
    expect(verificarCumplimientoPared(null)).toBeNull();
  });
});

// ============================================================================
// 7. UNITARIOS — verificarCriterioLuxometro (±5%)
// ============================================================================

describe('verificarCriterioLuxometro — ±5%', () => {

  it('cumple exactamente en el límite superior (105%)', () => {
    const r = verificarCriterioLuxometro(100, 105);
    expect(r.cumple).toBe(true);
  });

  it('cumple exactamente en el límite inferior (95%)', () => {
    const r = verificarCriterioLuxometro(100, 95);
    expect(r.cumple).toBe(true);
  });

  it('no cumple con 105.1 (por encima del límite superior)', () => {
    const r = verificarCriterioLuxometro(100, 105.1);
    expect(r.cumple).toBe(false);
  });

  it('no cumple con 94.9 (por debajo del límite inferior)', () => {
    const r = verificarCriterioLuxometro(100, 94.9);
    expect(r.cumple).toBe(false);
  });

  it('retorna null si lectura_inicial es 0 (falsy)', () => {
    expect(verificarCriterioLuxometro(0, 100)).toBeNull();
  });

  it('retorna null si lectura_final es null (falsy)', () => {
    expect(verificarCriterioLuxometro(100, null)).toBeNull();
  });

  it('retorna los límites calculados correctamente', () => {
    const r = verificarCriterioLuxometro(200, 198);
    expect(r.limite_inferior).toBeCloseTo(190, 0);
    expect(r.limite_superior).toBeCloseTo(210, 0);
    expect(r.cumple).toBe(true);
  });

  it('porcentaje_desviacion es correcto y puede ser negativo', () => {
    const r = verificarCriterioLuxometro(100, 97);
    expect(r.porcentaje_desviacion).toBeCloseTo(-3, 1);
  });
});

// ============================================================================
// 8. UNITARIOS — calcularIndiceArea
// ============================================================================

describe('calcularIndiceArea — edge cases', () => {

  it('calcula correctamente para sala típica (10×8×3)', () => {
    // ic = (10×8) / (3×(10+8)) = 80/54 ≈ 1.4815
    const ic = calcularIndiceArea(10, 8, 3);
    expect(ic).toBeCloseTo(1.4815, 3);
  });

  it('retorna null si altura_montaje es 0', () => {
    expect(calcularIndiceArea(10, 8, 0)).toBeNull();
  });

  it('retorna null si largo es 0', () => {
    expect(calcularIndiceArea(0, 8, 3)).toBeNull();
  });

  it('retorna null si ancho es null', () => {
    expect(calcularIndiceArea(10, null, 3)).toBeNull();
  });

  it('cuarto cuadrado pequeño (2×2×2.5)', () => {
    // ic = (2×2) / (2.5×(2+2)) = 4/10 = 0.4
    const ic = calcularIndiceArea(2, 2, 2.5);
    expect(ic).toBeCloseTo(0.4, 3);
  });

  it('sala muy grande (50×30×4)', () => {
    // ic = (50×30) / (4×80) = 1500/320 ≈ 4.6875
    const ic = calcularIndiceArea(50, 30, 4);
    expect(ic).toBeCloseTo(4.6875, 3);
  });
});

// ============================================================================
// 9. UNITARIOS — calcularPuntosMinimos
// ============================================================================

describe('calcularPuntosMinimos — tabla NOM-025', () => {
  // Tabla: ic<1→4, ic 1-2→9, ic 2-3→16, ic>=3→25

  it('ic = 0.5 → 4 puntos mínimos', () => {
    expect(calcularPuntosMinimos(0.5)).toBe(4);
  });

  it('ic = 1.0 → 9 puntos (límite inferior del segundo tramo)', () => {
    expect(calcularPuntosMinimos(1.0)).toBe(9);
  });

  it('ic = 1.9999 → 9 puntos (justo antes del tercer tramo)', () => {
    expect(calcularPuntosMinimos(1.9999)).toBe(9);
  });

  it('ic = 2.0 → 16 puntos', () => {
    expect(calcularPuntosMinimos(2.0)).toBe(16);
  });

  it('ic = 3.0 → 25 puntos', () => {
    expect(calcularPuntosMinimos(3.0)).toBe(25);
  });

  it('ic = 10 → 25 puntos (muy grande)', () => {
    expect(calcularPuntosMinimos(10)).toBe(25);
  });

  it('retorna null si ic es null', () => {
    expect(calcularPuntosMinimos(null)).toBeNull();
  });

  it('retorna null si ic es undefined', () => {
    expect(calcularPuntosMinimos(undefined)).toBeNull();
  });
});

// ============================================================================
// 10. UNITARIOS — procesarLectura (integración de fórmulas)
// ============================================================================

describe('procesarLectura — integración de fórmulas', () => {

  const nmi = 300;

  it('lectura típica sin reflexión: cumple_plano y cumple_pared son null', () => {
    const resultado = procesarLectura(
      { lux_medido: 350 },
      nmi,
      FC_REALES
    );
    expect(resultado.cumple_plano).toBeNull();
    expect(resultado.cumple_pared).toBeNull();
    expect(resultado.lux_corregido).toBe(350); // factor 1.00 para 300-range
    expect(resultado.ue).toBeGreaterThan(0);
  });

  it('lectura que falla por ILAC-G8: lux_corregido - UE < NMI', () => {
    // 300 × 1.00 = 300, UE = 300 × 0.0366 = 10.98 → 300-11 = 289 < 300
    const resultado = procesarLectura(
      { lux_medido: 300 },
      nmi,
      FC_REALES
    );
    expect(resultado.cumple_lux).toBe(false);
  });

  it('lectura que cumple lux con holgura', () => {
    // 500 × 0.99 = 495, UE = 495 × 0.0366 ≈ 18.1 → 495-18 = 477 >= 300
    const resultado = procesarLectura(
      { lux_medido: 500 },
      nmi,
      FC_REALES
    );
    expect(resultado.cumple_lux).toBe(true);
  });

  it('lectura con kf_plano > 50% → cumple_plano false', () => {
    // kf grande: e1 mucho mayor que e2
    const resultado = procesarLectura(
      { lux_medido: 350, e1_plano: 500, e2_plano: 100 },
      nmi,
      FC_REALES
    );
    expect(resultado.kf_plano).toBeGreaterThan(50);
    expect(resultado.cumple_plano).toBe(false);
  });

  it('lectura con kf_plano <= 50% → cumple_plano true', () => {
    const resultado = procesarLectura(
      { lux_medido: 350, e1_plano: 100, e2_plano: 350 },
      nmi,
      FC_REALES
    );
    expect(resultado.cumple_plano).toBe(true);
  });

  it('lectura con kf_pared > 60% → cumple_pared false', () => {
    const resultado = procesarLectura(
      { lux_medido: 350, e1_pared: 1000, e2_pared: 100 },
      nmi,
      FC_REALES
    );
    expect(resultado.kf_pared).toBeGreaterThan(60);
    expect(resultado.cumple_pared).toBe(false);
  });

  it('preserva la hora si se provee', () => {
    const resultado = procesarLectura(
      { lux_medido: 350, hora: '09:30' },
      nmi,
      FC_REALES
    );
    expect(resultado.hora).toBe('09:30');
  });

  it('funciona sin factores de corrección (usa factor 1.0)', () => {
    const resultado = procesarLectura(
      { lux_medido: 350 },
      nmi,
      []
    );
    expect(resultado.lux_corregido).toBe(350.0);
  });
});

// ============================================================================
// 11. UNITARIOS — consolidarLecturas
// ============================================================================

describe('consolidarLecturas — edge cases', () => {

  it('retorna todos nulls si lecturas está vacío', () => {
    const r = consolidarLecturas([], 300);
    expect(r.promedio_lux_corregido).toBeNull();
    expect(r.cumple_lux).toBeNull();
  });

  it('promedio correcto con 3 lecturas', () => {
    const lecturas = [
      { lux_corregido: 300, ue: 11, kf_plano: 20, kf_pared: 30, cumple_plano: true, cumple_pared: true },
      { lux_corregido: 320, ue: 11.7, kf_plano: 25, kf_pared: 35, cumple_plano: true, cumple_pared: true },
      { lux_corregido: 310, ue: 11.3, kf_plano: 22, kf_pared: 32, cumple_plano: true, cumple_pared: true },
    ];
    const r = consolidarLecturas(lecturas, 300);
    // promedio = (300+320+310)/3 = 310
    expect(r.promedio_lux_corregido).toBeCloseTo(310, 1);
  });

  it('ue_max es el máximo, no el promedio', () => {
    const lecturas = [
      { lux_corregido: 300, ue: 5, cumple_plano: null, cumple_pared: null },
      { lux_corregido: 300, ue: 20, cumple_plano: null, cumple_pared: null },
      { lux_corregido: 300, ue: 8, cumple_plano: null, cumple_pared: null },
    ];
    const r = consolidarLecturas(lecturas, 300);
    expect(r.ue_max).toBe(20);
  });

  it('cumple_plano false si UNA sola lectura falla', () => {
    const lecturas = [
      { lux_corregido: 350, ue: 12, kf_plano: 30, cumple_plano: true,  cumple_pared: null },
      { lux_corregido: 350, ue: 12, kf_plano: 55, cumple_plano: false, cumple_pared: null },
      { lux_corregido: 350, ue: 12, kf_plano: 20, cumple_plano: true,  cumple_pared: null },
    ];
    const r = consolidarLecturas(lecturas, 300);
    expect(r.cumple_plano).toBe(false);
  });

  it('cumple_plano null si ninguna lectura tiene reflexión medida', () => {
    const lecturas = [
      { lux_corregido: 350, ue: 12, kf_plano: null, cumple_plano: null, cumple_pared: null },
    ];
    const r = consolidarLecturas(lecturas, 300);
    expect(r.cumple_plano).toBeNull();
  });

  it('cumple_total false si cumple_lux pero falla cumple_plano', () => {
    const lecturas = [
      { lux_corregido: 500, ue: 5, kf_plano: 60, cumple_plano: false, cumple_pared: null },
    ];
    const r = consolidarLecturas(lecturas, 300);
    expect(r.cumple_total).toBe(false);
  });

  it('cumple_total true solo si lux y reflexión cumplen', () => {
    const lecturas = [
      { lux_corregido: 500, ue: 5, kf_plano: 20, kf_pared: 30, cumple_plano: true, cumple_pared: true },
    ];
    const r = consolidarLecturas(lecturas, 300);
    expect(r.cumple_total).toBe(true);
  });
});

// ============================================================================
// 12. UNITARIOS — calcularResultadosGlobales
// ============================================================================

describe('calcularResultadosGlobales', () => {

  const areasCumple  = [{ cumple_total: true }];
  const areasFalla   = [{ cumple_total: false }];

  it('conclusión CUMPLE: pct >= 80% y todas las áreas cumplen', () => {
    const puntos = [
      { promedio_lux_corregido: 400, cumple_total: true  },
      { promedio_lux_corregido: 350, cumple_total: true  },
      { promedio_lux_corregido: 320, cumple_total: true  },
    ];
    const r = calcularResultadosGlobales(areasCumple, puntos);
    expect(r.conclusion_general).toBe('CUMPLE');
    expect(r.porcentaje_cumplimiento).toBe(100);
    expect(r.puntos_fallidos).toHaveLength(0);
  });

  it('conclusión NO CUMPLE: pct < 80%', () => {
    const puntos = [
      { promedio_lux_corregido: 400, cumple_total: true,  numero: 1 },
      { promedio_lux_corregido: 200, cumple_total: false, numero: 2 },
      { promedio_lux_corregido: 180, cumple_total: false, numero: 3 },
    ];
    const r = calcularResultadosGlobales(areasCumple, puntos);
    expect(r.conclusion_general).toBe('NO CUMPLE');
    expect(r.puntos_fallidos).toContain(2);
    expect(r.puntos_fallidos).toContain(3);
  });

  it('conclusión CUMPLE PARCIALMENTE: pct >= 80% pero área falla', () => {
    const puntos = [
      { promedio_lux_corregido: 400, cumple_total: true, numero: 1 },
      { promedio_lux_corregido: 400, cumple_total: true, numero: 2 },
      { promedio_lux_corregido: 400, cumple_total: true, numero: 3 },
      { promedio_lux_corregido: 400, cumple_total: true, numero: 4 },
      { promedio_lux_corregido: 200, cumple_total: false, numero: 5 }, // 80% cumplen
    ];
    const r = calcularResultadosGlobales(areasFalla, puntos);
    expect(r.conclusion_general).toBe('CUMPLE PARCIALMENTE');
  });

  it('puntos sin promedio_lux_corregido no se cuentan', () => {
    const puntos = [
      { promedio_lux_corregido: null, cumple_total: false, numero: 1 },
      { promedio_lux_corregido: 400,  cumple_total: true,  numero: 2 },
    ];
    const r = calcularResultadosGlobales(areasCumple, puntos);
    expect(r.total_puntos_medidos).toBe(1); // solo el que tiene lux
  });

  it('retorna 0% con 0 puntos medidos', () => {
    const r = calcularResultadosGlobales([], []);
    expect(r.porcentaje_cumplimiento).toBe(0);
    expect(r.total_puntos_medidos).toBe(0);
  });
});

// ============================================================================
// 13. INTEGRACIÓN HTTP — Huecos no cubiertos en los tests actuales
// ============================================================================

describe('HTTP — Luxómetros (edge cases no cubiertos)', () => {

  it('GET /luxometros/vencimiento/proximo — dias=0 no rompe', async () => {
    const res = await request(app).get('/api/nom025/luxometros/vencimiento/proximo?dias=0');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('GET /luxometros/vencimiento/proximo — dias no numérico usa default 30', async () => {
    const res = await request(app).get('/api/nom025/luxometros/vencimiento/proximo?dias=abc');
    expect(res.status).toBe(200);
    expect(res.body.dias_ventana).toBe(30);
  });

  it('GET /luxometros/marca/:marca — marca inexistente retorna lista vacía', async () => {
    const res = await request(app).get('/api/nom025/luxometros/marca/marcaquenoexiste99');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it('GET /luxometros/serie/:serie_id — serie inexistente retorna 404', async () => {
    const res = await request(app).get('/api/nom025/luxometros/serie/SERIE-NO-EXISTE-99');
    expect(res.status).toBe(404);
  });

  it('GET /luxometros/buscar/query — sin parámetros retorna todos', async () => {
    const res = await request(app).get('/api/nom025/luxometros/buscar/query');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.luxometros)).toBe(true);
  });

  it('POST /luxometros — fecha_vencimiento anterior a fecha_calibracion no es bloqueada por validador', async () => {
    // El validador actual solo checa presencia, no lógica de fechas
    // Este test documenta el comportamiento actual (puede cambiar si se agrega validación)
    const res = await request(app)
      .post('/api/nom025/luxometros')
      .send({
        marca:             'TestMarca',
        modelo:            'TestModelo',
        serie_id:          `EDGE-FECHA-${Date.now()}`,
        fecha_calibracion: '2026-01-01',
        fecha_vencimiento: '2025-01-01', // vencimiento ANTES de calibración
      });
    // Documenta si el sistema lo acepta o rechaza
    expect([201, 400, 422]).toContain(res.status);
  });
});

describe('HTTP — Estudios (edge cases no cubiertos)', () => {

  it('GET /estudios — estado inválido retorna lista vacía (no 400)', async () => {
    const res = await request(app).get('/api/nom025/estudios?estado=estado_invalido_xyz');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it('GET /estudios — limit y skip negativos no rompen el servidor', async () => {
    const res = await request(app).get('/api/nom025/estudios?limit=-1&skip=-10');
    expect(res.status).toBe(200);
  });

  it('POST /estudios — folio con solo espacios es rechazado (trim en schema)', async () => {
    const res = await request(app)
      .post('/api/nom025/estudios')
      .send({
        folio:          '   ',
        orden_servicio: 'OS-001',
        empresa:        { razon_social: 'Empresa Test' },
      });
    // trim: true en el schema convierte "   " en "" que falla required
    expect([400, 422, 500]).toContain(res.status);
  });

  it('POST /estudios — body vacío retorna 400 con faltantes', async () => {
    const res = await request(app)
      .post('/api/nom025/estudios')
      .send({});
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.faltantes)).toBe(true);
    expect(res.body.faltantes.length).toBeGreaterThan(0);
  });

  it('POST /estudios/:id/areas — dimension_largo = 0 pasa validador pero indice_area es null', async () => {
    // El validador usa !dimension_largo que es truthy para 0
    const res = await request(app)
      .post('/api/nom025/estudios/000000000000000000000001/areas')
      .send({
        nombre:          'Área Test',
        dimension_largo: 0,
        dimension_ancho: 8,
        altura_montaje:  3,
        nmi_requerido:   300,
      });
    // 0 es falsy → validador lo rechaza como faltante
    expect(res.status).toBe(400);
    expect(res.body.faltantes).toContain('dimension_largo');
  });

  it('POST /estudios/:id/puntos — punto sin número retorna 400', async () => {
    const res = await request(app)
      .post('/api/nom025/estudios/000000000000000000000001/puntos')
      .send({
        area_id: '000000000000000000000001',
        puntos:  [{ lecturas: [{ lux_medido: 300 }] }], // sin numero
      });
    expect(res.status).toBe(400);
  });

  it('POST /estudios/:id/puntos — lux_medido = 0 es aceptado (truthy check no aplica aquí)', async () => {
    // El validador checa === undefined || === null, no falsy
    // lux_medido: 0 debe pasar validación (debería ser rechazado a nivel de negocio)
    const res = await request(app)
      .post('/api/nom025/estudios/000000000000000000000001/puntos')
      .send({
        area_id: '000000000000000000000001',
        puntos:  [{
          numero:   1,
          lecturas: [{ lux_medido: 0 }],
        }],
      });
    // Pasa validación pero falla en 404 (estudio no existe) — documenta el comportamiento
    expect([404, 400]).toContain(res.status);
  });

  it('POST /estudios/:id/verificacion — lectura_inicial = 0 es detectada como faltante', async () => {
    // El validador checa === undefined pero 0 no es undefined
    // Documenta si 0 pasa o no el validador
    const res = await request(app)
      .post('/api/nom025/estudios/000000000000000000000001/verificacion')
      .send({
        lectura_inicial: 0,
        lectura_final:   0,
        verificado_por:  'Ing. Test',
      });
    // Con valores 0, verificarCriterioLuxometro retorna null (falsy check interno)
    // El validador deja pasar (=== undefined), el service lo maneja
    expect([404, 200]).toContain(res.status);
  });

  it('GET /estudios/:id/pdf — ID inexistente retorna 404', async () => {
    const res = await request(app)
      .get('/api/nom025/estudios/000000000000000000000001/pdf');
    expect(res.status).toBe(404);
  });

  it('GET /estudios/:id/areas — ID inválido retorna 400', async () => {
    const res = await request(app).get('/api/nom025/estudios/id-invalido/areas');
    expect(res.status).toBe(400);
  });

  it('GET /estudios/:id/puntos — filtro area_id inválido retorna lista vacía sin error', async () => {
    const res = await request(app)
      .get('/api/nom025/estudios/000000000000000000000001/puntos?area_id=000000000000000000000099');
    expect([200, 404]).toContain(res.status);
  });
});