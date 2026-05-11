'use strict';

const request = require('supertest');
const app     = require('../../App');

const {
  seleccionarFactor,
  corregirLux,
  calcularKf,
  calcularUE,
  verificarCumplimientoLux,
  procesarLectura,
  consolidarLecturas,
  procesarPunto,
} = require('../../src/modules/nom025/service');

// ============================================================================
// DATOS REALES — Certificado SIMH-OPTICA/0008-2025
// Informe AL025/250619-27 — Cementos Moctezuma, S.A. de C.V. (Planta Lerma)
//
// Fuente: hoja HM-T del Excel, columnas C-T, filas 10-45
// Tabla de factores: filas 51-60, columnas C-D
// u_relativa: Generador!F9 = 3.66% → 0.0366
// ============================================================================

const FC_REALES = [
  { iluminancia_ref:   21.58, factor: 0.9269 },
  { iluminancia_ref:   51.42, factor: 0.9724 },
  { iluminancia_ref:   99.17, factor: 1.0084 },
  { iluminancia_ref:  199.29, factor: 1.0096 },
  { iluminancia_ref:  303.59, factor: 0.9882 },
  { iluminancia_ref:  515.30, factor: 0.9851 },
  { iluminancia_ref:  715.50, factor: 0.9952 },
  { iluminancia_ref:  999.17, factor: 0.9989 },
  { iluminancia_ref: 2007.83, factor: 0.9961 },
  { iluminancia_ref: 4170.83, factor: 0.9590 },
];

const U_RELATIVA = 0.0366;
const NMI = 300; // lux — tarea visual "distinción moderada de detalles"

// ============================================================================
// MEDICIÓN 1 — Escritorio de Personal de Ventas No. 1
//
// Lecturas extraídas del Excel (hoja HM-T, columna C):
//   Lectura 1 (07:20): lux=325.6, E1_plano=24.65,  E2_plano=306.5
//   Lectura 2 (10:50): lux=465.3, E1_plano=45.32,  E2_plano=426.5
//   Lectura 3 (14:30): lux=395.6, E1_plano=33.26,  E2_plano=325.6
//
// Resultados calculados por el Excel (filas 38-45, columna C):
//   lux_corregido 1 = 321.75792
//   lux_corregido 2 = 458.36703
//   lux_corregido 3 = 390.93192
//   kf_plano 1 = 7.543527...%
//   kf_plano 2 = 10.489034...%
//   kf_plano 3 = 9.581331...%
// ============================================================================

describe('NOM-025 — End-to-End con datos reales (AL025/250619-27)', () => {

  // ── 1. seleccionarFactor con tabla real ─────────────────────────────────

  describe('seleccionarFactor — certificado SIMH-OPTICA/0008-2025', () => {

    it('325.6 lux → factor más cercano a 303.59 → 0.9882', () => {
      // |303.59 - 325.6| = 22.01 vs |515.30 - 325.6| = 189.7 → gana 303.59
      expect(seleccionarFactor(325.6, FC_REALES)).toBe(0.9882);
    });

    it('465.3 lux → factor más cercano a 515.30 → 0.9851', () => {
      // |515.30 - 465.3| = 50.0 vs |303.59 - 465.3| = 161.71 → gana 515.30
      expect(seleccionarFactor(465.3, FC_REALES)).toBe(0.9851);
    });

    it('395.6 lux → factor más cercano a 303.59 → 0.9882', () => {
      // |303.59 - 395.6| = 92.01 vs |515.30 - 395.6| = 119.7 → gana 303.59
      expect(seleccionarFactor(395.6, FC_REALES)).toBe(0.9882);
    });

    it('24.65 lux (E1 plano) → factor más cercano a 21.58 → 0.9269', () => {
      expect(seleccionarFactor(24.65, FC_REALES)).toBe(0.9269);
    });

    it('306.5 lux (E2 plano) → factor más cercano a 303.59 → 0.9882', () => {
      expect(seleccionarFactor(306.5, FC_REALES)).toBe(0.9882);
    });
  });

  // ── 2. corregirLux con valores reales ───────────────────────────────────

  describe('corregirLux — valores exactos del Excel', () => {

    it('lectura 1: 325.6 × 0.9882 = 321.8 (Excel: 321.75792)', () => {
      // Excel: 321.75792 exacto, toFixed(1) da 321.8
      const resultado = corregirLux(325.6, FC_REALES);
      expect(resultado).toBeCloseTo(321.8, 0);
    });

    it('lectura 2: 465.3 × 0.9851 = 458.4 (Excel: 458.36703)', () => {
      const resultado = corregirLux(465.3, FC_REALES);
      expect(resultado).toBeCloseTo(458.4, 0);
    });

    it('lectura 3: 395.6 × 0.9882 = 390.9 (Excel: 390.93192)', () => {
      const resultado = corregirLux(395.6, FC_REALES);
      expect(resultado).toBeCloseTo(390.9, 0);
    });
  });

  // ── 3. calcularKf con valores reales ────────────────────────────────────

  describe('calcularKf — kf_plano exacto del Excel', () => {

    it('lectura 1: kf_plano = (fc(24.65)*24.65) / (fc(306.5)*306.5) × 100 ≈ 7.54%', () => {
      // fc(24.65)=0.9269, fc(306.5)=0.9882
      // (0.9269×24.65) / (0.9882×306.5) × 100 = 22.848 / 302.983 × 100 ≈ 7.54%
      const kf = calcularKf(24.65, 306.5, FC_REALES);
      expect(kf).toBeCloseTo(7.54, 1);
    });

    it('lectura 2: kf_plano ≈ 10.49%', () => {
      // fc(45.32)=0.9724, fc(426.5)=0.9851
      // (0.9724×45.32) / (0.9851×426.5) × 100 ≈ 10.49%
      const kf = calcularKf(45.32, 426.5, FC_REALES);
      expect(kf).toBeCloseTo(10.49, 1);
    });

    it('lectura 3: kf_plano ≈ 9.58%', () => {
      const kf = calcularKf(33.26, 325.6, FC_REALES);
      expect(kf).toBeCloseTo(9.58, 1);
    });

    it('todas las kf_plano son < 50% → cumplen reflexión de plano', () => {
      const kf1 = calcularKf(24.65, 306.5, FC_REALES);
      const kf2 = calcularKf(45.32, 426.5, FC_REALES);
      const kf3 = calcularKf(33.26, 325.6, FC_REALES);
      expect(kf1).toBeLessThan(50);
      expect(kf2).toBeLessThan(50);
      expect(kf3).toBeLessThan(50);
    });
  });

  // ── 4. calcularUE con valores reales ────────────────────────────────────

  describe('calcularUE — u_relativa 3.66% del certificado', () => {

    it('UE lectura 1: 321.8 × 0.0366 ≈ 11.8 lux', () => {
      expect(calcularUE(321.8, U_RELATIVA)).toBeCloseTo(11.8, 0);
    });

    it('UE lectura 2: 458.4 × 0.0366 ≈ 16.8 lux', () => {
      expect(calcularUE(458.4, U_RELATIVA)).toBeCloseTo(16.8, 0);
    });

    it('UE lectura 3: 390.9 × 0.0366 ≈ 14.3 lux', () => {
      expect(calcularUE(390.9, U_RELATIVA)).toBeCloseTo(14.3, 0);
    });
  });

  // ── 5. Procesamiento completo de las 3 lecturas ─────────────────────────

  describe('procesarLectura — 3 lecturas reales del punto 1', () => {

    const lectura1 = { hora: '07:20', lux_medido: 325.6, e1_plano: 24.65,  e2_plano: 306.5 };
    const lectura2 = { hora: '10:50', lux_medido: 465.3, e1_plano: 45.32,  e2_plano: 426.5 };
    const lectura3 = { hora: '14:30', lux_medido: 395.6, e1_plano: 33.26,  e2_plano: 325.6 };

    it('lectura 1: lux_corregido ≈ 321.8, cumple_lux=true, cumple_plano=true', () => {
      const r = procesarLectura(lectura1, NMI, FC_REALES, U_RELATIVA);
      expect(r.lux_corregido).toBeCloseTo(321.8, 0);
      expect(r.kf_plano).toBeCloseTo(7.54, 1);
      expect(r.ue).toBeCloseTo(11.8, 0);
      expect(r.cumple_lux).toBe(true);   // 321.8 - 11.8 = 310 >= 300
      expect(r.cumple_plano).toBe(true); // 7.54% <= 50%
      expect(r.cumple_pared).toBeNull(); // sin pared
    });

    it('lectura 2: lux_corregido ≈ 458.4, cumple_lux=true, cumple_plano=true', () => {
      const r = procesarLectura(lectura2, NMI, FC_REALES, U_RELATIVA);
      expect(r.lux_corregido).toBeCloseTo(458.4, 0);
      expect(r.kf_plano).toBeCloseTo(10.49, 1);
      expect(r.cumple_lux).toBe(true);
      expect(r.cumple_plano).toBe(true);
    });

    it('lectura 3: lux_corregido ≈ 390.9, cumple_lux=true, cumple_plano=true', () => {
      const r = procesarLectura(lectura3, NMI, FC_REALES, U_RELATIVA);
      expect(r.lux_corregido).toBeCloseTo(390.9, 0);
      expect(r.kf_plano).toBeCloseTo(9.58, 1);
      expect(r.cumple_lux).toBe(true);
      expect(r.cumple_plano).toBe(true);
    });
  });

  // ── 6. Consolidación del punto completo ─────────────────────────────────

  describe('consolidarLecturas — punto 1 completo', () => {

    const lecturas3 = [
      { lux_corregido: 321.8, ue: 11.8, kf_plano:  7.54, kf_pared: null, cumple_plano: true,  cumple_pared: null },
      { lux_corregido: 458.4, ue: 16.8, kf_plano: 10.49, kf_pared: null, cumple_plano: true,  cumple_pared: null },
      { lux_corregido: 390.9, ue: 14.3, kf_plano:  9.58, kf_pared: null, cumple_plano: true,  cumple_pared: null },
    ];

    it('promedio lux corregido ≈ 390.4 (Excel: 390.35229)', () => {
      // (321.8 + 458.4 + 390.9) / 3 ≈ 390.37
      const r = require('../../src/modules/nom025/service').consolidarLecturas(lecturas3, NMI);
      expect(r.promedio_lux_corregido).toBeCloseTo(390.4, 0);
    });

    it('ue_max = 16.8 lux (de la lectura 2, la mayor)', () => {
      const r = require('../../src/modules/nom025/service').consolidarLecturas(lecturas3, NMI);
      expect(r.ue_max).toBeCloseTo(16.8, 0);
    });

    it('cumple_lux = true: promedio(390.4) - ue_max(16.8) = 373.6 >= 300', () => {
      const r = require('../../src/modules/nom025/service').consolidarLecturas(lecturas3, NMI);
      expect(r.cumple_lux).toBe(true);
    });

    it('cumple_plano = true: todas las lecturas tienen kf < 50%', () => {
      const r = require('../../src/modules/nom025/service').consolidarLecturas(lecturas3, NMI);
      expect(r.cumple_plano).toBe(true);
    });

    it('cumple_total = true', () => {
      const r = require('../../src/modules/nom025/service').consolidarLecturas(lecturas3, NMI);
      expect(r.cumple_total).toBe(true);
    });
  });

  // ── 7. procesarPunto completo ────────────────────────────────────────────

  describe('procesarPunto — punto 1 completo con datos del Excel', () => {

    const punto1 = {
      numero: 1,
      area_id: null,
      ubicacion: 'Escritorio de Personal de Ventas No. 1',
      tipo_iluminacion: 'Mixta',
      nmi_requerido: 300,
      lecturas: [
        { hora: '07:20', lux_medido: 325.6, e1_plano: 24.65, e2_plano: 306.5 },
        { hora: '10:50', lux_medido: 465.3, e1_plano: 45.32, e2_plano: 426.5 },
        { hora: '14:30', lux_medido: 395.6, e1_plano: 33.26, e2_plano: 325.6 },
      ],
    };

    it('procesa las 3 lecturas y produce resultados consolidados', () => {
      const r = procesarPunto(punto1, NMI, FC_REALES, U_RELATIVA);
      expect(r.lecturas).toHaveLength(3);
      expect(r.promedio_lux_corregido).toBeCloseTo(390.4, 0);
      expect(r.ue_max).toBeCloseTo(16.8, 0);
      expect(r.cumple_lux).toBe(true);
      expect(r.cumple_plano).toBe(true);
      expect(r.cumple_total).toBe(true);
    });

    it('los lux_corregidos individuales coinciden con el Excel', () => {
      const r = procesarPunto(punto1, NMI, FC_REALES, U_RELATIVA);
      expect(r.lecturas[0].lux_corregido).toBeCloseTo(321.8, 0);
      expect(r.lecturas[1].lux_corregido).toBeCloseTo(458.4, 0);
      expect(r.lecturas[2].lux_corregido).toBeCloseTo(390.9, 0);
    });

    it('los kf_plano individuales coinciden con el Excel', () => {
      const r = procesarPunto(punto1, NMI, FC_REALES, U_RELATIVA);
      expect(r.lecturas[0].kf_plano).toBeCloseTo(7.54,  1);
      expect(r.lecturas[1].kf_plano).toBeCloseTo(10.49, 1);
      expect(r.lecturas[2].kf_plano).toBeCloseTo(9.58,  1);
    });
  });

  // ── 8. Verificación de medición 4 (alta iluminación) ────────────────────
  //
  // Medición 4: "Analista de Control de Calidad" — área de laboratorio
  // NMI = 300, lux medidos muy altos (zona exterior con mucha luz)
  // lux_medido 1 = 726.3, lux_medido 2 = 1326, lux_medido 3 = 943.3

  describe('procesarPunto — medición 4 (lux alto, laboratorio)', () => {

    const punto4 = {
      numero: 4,
      area_id: null,
      ubicacion: 'Escritorio de Analista de Control de Calidad',
      tipo_iluminacion: 'Mixta',
      nmi_requerido: 300,
      lecturas: [
        { hora: '07:26', lux_medido: 726.3,  e1_plano: 142.3,  e2_plano: 700.3  },
        { hora: '10:56', lux_medido: 1326,   e1_plano: 215.6,  e2_plano: 1215   },
        { hora: '14:36', lux_medido: 943.3,  e1_plano: 178.5,  e2_plano: 872.3  },
      ],
    };

    it('cumple_lux = true (lux muy por encima del NMI 300)', () => {
      const r = procesarPunto(punto4, NMI, FC_REALES, U_RELATIVA);
      expect(r.cumple_lux).toBe(true);
      expect(r.promedio_lux_corregido).toBeGreaterThan(500);
    });

    it('cumple_plano = true (kf << 50%)', () => {
      const r = procesarPunto(punto4, NMI, FC_REALES, U_RELATIVA);
      expect(r.cumple_plano).toBe(true);
      // kf típico para estos valores es ~20%
      r.lecturas.forEach(l => {
        expect(l.kf_plano).toBeLessThan(50);
      });
    });

    it('cumple_total = true', () => {
      const r = procesarPunto(punto4, NMI, FC_REALES, U_RELATIVA);
      expect(r.cumple_total).toBe(true);
    });
  });

  // ── 9. Verificación de medición 15 (área exterior, lux muy alto) ─────────
  //
  // Medición 15: "Trascavista" — Área de Grava Caliza
  // NMI = 200 (requerimiento visual simple)
  // lux_medidos = 8653, 18965, 15624 (exteriores)

  describe('procesarPunto — medición 15 (exterior, lux extremo)', () => {

    const punto15 = {
      numero: 15,
      area_id: null,
      ubicacion: 'Área de Grava Caliza - Al Centro de Zona de Maniobras',
      tipo_iluminacion: 'Mixta',
      nmi_requerido: 200,
      lecturas: [
        { hora: '07:48', lux_medido: 8653,  e1_plano: 1256,  e2_plano: 7621  },
        { hora: '11:14', lux_medido: 18965, e1_plano: 6632,  e2_plano: 17659 },
        { hora: '14:54', lux_medido: 15624, e1_plano: 3456,  e2_plano: 13265 },
      ],
    };

    it('selecciona el factor correcto para lux extremo (≥4170.83 → 0.9590)', () => {
      expect(seleccionarFactor(8653, FC_REALES)).toBe(0.9590);
      expect(seleccionarFactor(18965, FC_REALES)).toBe(0.9590);
    });

    it('cumple_lux = true (lux >> 200 NMI)', () => {
      const r = procesarPunto(punto15, 200, FC_REALES, U_RELATIVA);
      expect(r.cumple_lux).toBe(true);
      expect(r.promedio_lux_corregido).toBeGreaterThan(1000);
    });

    it('cumple_total = true', () => {
      const r = procesarPunto(punto15, 200, FC_REALES, U_RELATIVA);
      expect(r.cumple_total).toBe(true);
    });
  });

  // ── 10. Punto 7 — sin segunda lectura (None en Excel) ───────────────────
  //
  // Medición 7: "Analista de Calidad" — Al Centro de Pileta No. 1
  // Lectura 2 y 3 son None en el Excel (sin medición de esa hora)

  describe('procesarPunto — medición 7 (solo 1 lectura disponible)', () => {

    const punto7 = {
      numero: 7,
      area_id: null,
      ubicacion: 'Al Centro de Pileta No. 1',
      tipo_iluminacion: 'Artificial',
      nmi_requerido: 200,
      lecturas: [
        { hora: '07:32', lux_medido: 522.8, e1_plano: 58.04, e2_plano: 452.3 },
        // lecturas 2 y 3 no aplican (None en Excel)
      ],
    };

    it('con 1 sola lectura: promedio = esa lectura', () => {
      const r = procesarPunto(punto7, 200, FC_REALES, U_RELATIVA);
      expect(r.lecturas).toHaveLength(1);
      expect(r.promedio_lux_corregido).toBeCloseTo(r.lecturas[0].lux_corregido, 4);
    });

    it('cumple_lux = true (522 × factor >> 200 NMI)', () => {
      const r = procesarPunto(punto7, 200, FC_REALES, U_RELATIVA);
      expect(r.cumple_lux).toBe(true);
    });
  });
});






