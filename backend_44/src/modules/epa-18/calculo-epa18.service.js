// services/calculo-epa18.js
// Replica las fórmulas del Excel EPA 18-1994
// Verificado celda a celda contra FFE18-250314-91.xlsx
// Sincronizado con muestreo.model.js (FC-AAR-004 Rev.23)
'use strict';

// ─────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────

const IN_HG_A_MMHG = 25.4;

/**
 * Límites de cuantificación (mg) — Datos de Campo col V
 * Nombres exactos según Datos de Campo B30:B38
 */
const ANALITOS_LPC = {
  'Benceno':              0.0525,
  'Tolueno':              0.0518,
  'Clorobenceno':         0.0497,
  'EtilBenceno':          0.0518,   // mayúscula B — fuente primaria Datos de Campo B33
  'o-Xileno':             0.0525,
  'm,p-Xileno':           0.1030,
  '1,3-Diclorobenceno':   0.0517,
  '1,4-Diclorobenceno':   0.0517,
  '1,2-Diclorobenceno':   0.0517,
};

/** Incertidumbre (%) — Caratula col O */
const INCERTIDUMBRE_VID_E_019 = {
  'Benceno':              8.69,
  'Tolueno':              9.02,
  'Clorobenceno':         9.57,
  'EtilBenceno':          6.22,
  'o-Xileno':             8.88,   // fila 27 Caratula
  'm,p-Xileno':           4.09,   // fila 26 Caratula
  '1,3-Diclorobenceno':   8.71,
  '1,4-Diclorobenceno':   7.40,
  '1,2-Diclorobenceno':   9.42,
};

/** Incertidumbre (%) — Caratula col R */
const INCERTIDUMBRE_VID_E_181A = {
  'Benceno':              6.46,
  'Tolueno':              6.60,
  'Clorobenceno':         6.52,
  'EtilBenceno':          6.86,
  'o-Xileno':             6.18,
  'm,p-Xileno':           11.02,
  '1,3-Diclorobenceno':   6.86,
  '1,4-Diclorobenceno':   5.24,
  '1,2-Diclorobenceno':   6.08,
};

/** UE Bomba de succión — Caratula S22 */
const UE_BOMBA_SUCCION = 1.65;

/**
 * Tablas de factores KL extraídas de la Hoja "Factores" del Excel
 * Fuente: NMX-AA-009-1993-SCFI
 * Clave = número de puntos por diámetro
 */
const TABLA_KL_CIRCULAR = {
  2:  [0.146, 0.854],
  4:  [0.067, 0.250, 0.750, 0.933],
  6:  [0.044, 0.147, 0.295, 0.705, 0.853, 0.956],
  8:  [0.033, 0.105, 0.194, 0.323, 0.677, 0.806, 0.895, 0.967],
  10: [0.025, 0.082, 0.146, 0.226, 0.342, 0.658, 0.774, 0.854, 0.918, 0.975],
  12: [0.021, 0.067, 0.118, 0.177, 0.250, 0.355, 0.645, 0.750, 0.823, 0.882, 0.933, 0.979],
  14: [0.018, 0.057, 0.099, 0.146, 0.201, 0.269, 0.366, 0.634, 0.731, 0.799, 0.854, 0.901, 0.943, 0.982],
  16: [0.016, 0.049, 0.085, 0.125, 0.169, 0.220, 0.283, 0.375, 0.625, 0.717, 0.780, 0.831, 0.875, 0.915, 0.951, 0.984],
  18: [0.014, 0.044, 0.075, 0.109, 0.146, 0.188, 0.236, 0.296, 0.382, 0.618, 0.704, 0.764, 0.812, 0.854, 0.891, 0.925, 0.956, 0.986],
  20: [0.013, 0.039, 0.067, 0.097, 0.129, 0.165, 0.204, 0.250, 0.306, 0.388, 0.612, 0.694, 0.750, 0.796, 0.835, 0.871, 0.903, 0.933, 0.961, 0.987],
  22: [0.011, 0.035, 0.060, 0.087, 0.116, 0.146, 0.180, 0.218, 0.261, 0.315, 0.393, 0.607, 0.685, 0.739, 0.782, 0.820, 0.854, 0.884, 0.913, 0.940, 0.965, 0.989],
  24: [0.011, 0.032, 0.055, 0.079, 0.105, 0.132, 0.161, 0.194, 0.230, 0.272, 0.323, 0.398, 0.602, 0.677, 0.728, 0.770, 0.806, 0.839, 0.868, 0.895, 0.921, 0.945, 0.968, 0.989],
};

/** Factores KL para ductos pequeños (0.1m ≤ D < 0.3m) — Factores S14:V25 */
const TABLA_KL_DUCTO_PEQUENO = {
  // >20cm (D entre 0.2m y 0.3m)
  mayor20cm: [0.085, 0.125, 0.169, 0.220, 0.283, 0.375, 0.625, 0.717, 0.780, 0.831, 0.875, 0.915],
  // <20cm (D entre 0.1m y 0.2m)
  menor20cm: [0.169, 0.220, 0.283, 0.375, 0.625, 0.717, 0.780, 0.831],
};

// ─────────────────────────────────────────────────────────
// Funciones de apoyo
// ─────────────────────────────────────────────────────────

/**
 * Obtiene impactores del payload — soporta modelo nuevo y legacy
 * Modelo nuevo: datos.determinacion_humedad.impactores[]
 * Legacy:       datos.impactores[]
 */
function _extraerImpactores(datos) {
  return datos.determinacion_humedad?.impactores
      ?? datos.impactores
      ?? null;
}

// ─────────────────────────────────────────────────────────
// Funciones de cálculo auxiliares (nuevas)
// ─────────────────────────────────────────────────────────

/**
 * Presión en el conducto (inHg) [HC Gases R13]
 * = Pb_inHg + 0.07355 × Pe_inH2O
 */
function calcularPresionConducto(pb_inHg, pe_inH2O) {
  return parseFloat((pb_inHg + 0.07355 * (pe_inH2O ?? 0)).toFixed(6));
}

/**
 * Diámetro equivalente para ductos rectangulares [Hoja de Campo L29]
 * Deq = (2 × L1 × L2) / (L1 + L2)
 */
function calcularDiametroEquivalente(largo_m, ancho_m) {
  if (!largo_m || !ancho_m || largo_m <= 0 || ancho_m <= 0) return null;
  return parseFloat(((2 * largo_m * ancho_m) / (largo_m + ancho_m)).toFixed(6));
}

/**
 * Relaciones A/Dch, B/Dch, C/Dch [Hoja de Campo O27, U27, O28]
 */
function calcularRelacionesDiametros(alturaSalida_m, alturaPerturbacion_m, alturaEntrePuertos_m, diametro_m) {
  if (!diametro_m || diametro_m <= 0) return { diametros_en_A: null, diametros_en_B: null, diametros_en_C: null };
  return {
    diametros_en_A: alturaSalida_m      ? parseFloat((alturaSalida_m / diametro_m).toFixed(2))      : null,
    diametros_en_B: alturaPerturbacion_m? parseFloat((alturaPerturbacion_m / diametro_m).toFixed(2)): null,
    diametros_en_C: alturaEntrePuertos_m? parseFloat((alturaEntrePuertos_m / diametro_m).toFixed(2)): null,
  };
}

/**
 * Verificación del criterio del 5% de la bomba [HC Gases R45, T45, V45]
 * Criterio: fi×0.95 ≤ ff ≤ fi
 */
function verificarCriterioBomba(flujoInicial_Lmin, flujoFinal_Lmin) {
  if (!flujoInicial_Lmin || !flujoFinal_Lmin) {
    return { cumple_criterio_5pct: false,
             verificacion: { limite_inferior_5pct: null, limite_superior_5pct: null, porcentaje_desviacion: null } };
  }
  const limInf = parseFloat((flujoInicial_Lmin * 0.95).toFixed(4));
  const pctDesv = parseFloat((((flujoFinal_Lmin - flujoInicial_Lmin) / flujoInicial_Lmin) * 100).toFixed(2));
  return {
    cumple_criterio_5pct: flujoFinal_Lmin >= limInf,
    verificacion: {
      limite_inferior_5pct:  limInf,
      limite_superior_5pct:  flujoInicial_Lmin,
      porcentaje_desviacion: pctDesv,
    },
  };
}

/**
 * Validación de humedad — no debe superar el 3% [HC Gases D53]
 */
function validarHumedad(bws) {
  const pct = parseFloat((bws * 100).toFixed(2));
  return {
    humedad_pct:  pct,
    cumple_norma: pct <= 3,
    mensaje: pct <= 3
      ? 'Humedad dentro del límite permitido (<3%)'
      : `ADVERTENCIA: Humedad ${pct}% supera el límite del 3% — resultados no válidos según EPA 18`,
  };
}

/**
 * Validación general del muestreo EPA 18
 */
function validarMuestreoEPA18(datos) {
  const result = { es_valido: true, advertencias: [], errores: [] };
  if ((datos.fraccion_humedad_bws ?? 0) * 100 > 3) {
    result.es_valido = false;
    result.errores.push(`Humedad ${((datos.fraccion_humedad_bws ?? 0) * 100).toFixed(2)}% excede el límite del 3%`);
  }
  if (datos.cumple_criterio_5pct === false)
    result.advertencias.push('La bomba no cumple el criterio de desviación del 5%');
  if (datos.dp_promedio_inH2O != null && datos.dp_promedio_inH2O <= 0)
    result.advertencias.push('Presión dinámica ≤ 0 — verificar lecturas de campo');
  return result;
}

/**
 * Calcula distancias de puntos: distancia_m = (KL × Dch) + EPM
 * Si el punto ya tiene factor_kl calculado lo usa; si no, lo busca en TABLA_KL_CIRCULAR
 */
function calcularDistanciasPuntos(puntos, diametro_m, extension_puerto_m = 0.1) {
  if (!Array.isArray(puntos) || !diametro_m) return puntos ?? [];
  return puntos.map(p => ({
    ...p,
    distancia_m: p.factor_kl != null
      ? parseFloat(((p.factor_kl * diametro_m) + extension_puerto_m).toFixed(5))
      : null,
  }));
}

/**
 * Resumen de resultados para el informe
 */
function generarResumenResultados(resultados) {
  if (!resultados) return null;
  const detectados = (resultados.analitos ?? []).filter(a => !a.por_debajo_lpc);
  return {
    fecha_calculo:  new Date().toISOString(),
    velocidad_gases_m_s:           resultados.velocidad_gases_m_s,
    flujo_volumetrico_m3_h:        resultados.flujo_vol_m3_h,
    concentracion_total_COV_mg_m3: resultados.concentracion_total_COV_mg_m3,
    analitos_detectados:           detectados.length,
    analitos_por_debajo_LPC:       (resultados.analitos ?? []).filter(a => a.por_debajo_lpc).map(a => a.nombre),
    emision_total_COV_kg_h:        (resultados.analitos ?? []).reduce((s, a) => s + (a.emision_kg_h ?? 0), 0),
  };
}

// ─────────────────────────────────────────────────────────
// Funciones de cálculo principales (verificadas vs Excel)
// ─────────────────────────────────────────────────────────

/**
 * 1. Presión barométrica [HC Gases G13]
 *    = 760 × exp(−0.000117 × altitud) / 25.4  →  inHg
 */
function calcularPresionBarometrica(altitud_msnm) {
  const alt = altitud_msnm ?? 0;
  const pb_inHg = 760 * Math.exp(-0.000117 * alt) / IN_HG_A_MMHG;
  return { pb_inHg, pb_mmHg: pb_inHg * IN_HG_A_MMHG };
}

/**
 * 2. Área de chimenea [Datos de Campo H9]
 *    Circular / Cuadrada-sin-lados → (π/4) × Dch²
 *    Rectangular / Cuadrada-con-lados → L1 × L2
 */
function calcularAreaChimenea({ forma_geometrica, forma, diametro_m, largo_m, ancho_m }) {
  const tipo = forma_geometrica ?? forma;
  if (tipo === 'Circular') return (Math.PI / 4) * Math.pow(diametro_m, 2);
  if (largo_m != null && ancho_m != null) return largo_m * ancho_m;
  if (diametro_m != null) return (Math.PI / 4) * Math.pow(diametro_m, 2);
  throw new Error('calcularAreaChimenea: faltan dimensiones');
}

/**
 * 3. Presión absoluta (mmHg) [Datos de Campo H12]
 *    = (Pb_inHg + Pe_inH2O / 13.6) × 25.4
 */
function calcularPresionAbsoluta(pb_inHg, pe_inH2O) {
  return (pb_inHg + (pe_inH2O ?? 0) / 13.6) * IN_HG_A_MMHG;
}

/**
 * 4. Flujo promedio de bomba y volumen muestreado [HC Gases O39, U22]
 */
function calcularVolumenMuestreado({ flujo_inicial_Lmin, flujo_final_Lmin,
                                     factor_calibracion_fcg, fcg, tiempo_min }) {
  const fcg_val = factor_calibracion_fcg ?? fcg ?? 1;
  const flujo_promedio_Lmin = (flujo_inicial_Lmin + flujo_final_Lmin) / 2;
  const vm_litros = flujo_promedio_Lmin * fcg_val * tiempo_min;
  return { flujo_promedio_Lmin, vm_litros, vm_m3: vm_litros / 1000 };
}

/**
 * 5. Contenido de humedad BWS [HC Gases U25]
 *    Acepta determinacion_humedad.impactores[] (modelo) o impactores[] / ganancia_impX_g (legacy)
 */
function calcularHumedad({ impactores, ganancia_imp1_g, ganancia_imp2_g,
                            ganancia_imp3_g, ganancia_imp4_g,
                            temperatura_C, pb_inHg, pe_inH2O, vm_litros }) {
  let ptac;
  if (Array.isArray(impactores) && impactores.length > 0) {
    ptac = impactores.reduce((s, i) => s + (i.ganancia_g ?? 0), 0);
  } else {
    ptac = (ganancia_imp1_g ?? 0) + (ganancia_imp2_g ?? 0)
         + (ganancia_imp3_g ?? 0) + (ganancia_imp4_g ?? 0);
  }
  const r13   = pb_inHg + 0.07355 * (pe_inH2O ?? 0);
  const tch_F = temperatura_C * 1.8 + 32;
  const num   = 0.0756 * ptac * ((tch_F + 460) / r13);
  return { bws: num / (num + vm_litros), ptac_g: ptac };
}

/**
 * 6. Peso molecular húmedo [Datos de Campo H15]
 */
function calcularPesoMolecular({ O2_pct, CO_ppm, CO2_pct, bws }) {
  const N2  = 100 - (O2_pct + CO2_pct + (CO_ppm ?? 0) / 10000);
  const pmh = ((0.44 * CO2_pct + 0.32 * O2_pct + 0.28 * (N2 + (CO_ppm ?? 0) / 10000)) * (1 - bws))
            + 18 * bws;
  return { pmh, N2_pct: N2 };
}

/**
 * 7. Presión dinámica promedio [Hoja de Campo Y59]
 *    AVERAGE de lecturas no-nulas (null = punto no medido, no se incluye)
 *    Acepta puntos[] (modelo) o dp_inH2O[] (legacy)
 */
function calcularDpPromedio({ puntos, dp_inH2O }) {
  let lecturas;
  if (Array.isArray(puntos) && puntos.length > 0) {
    lecturas = puntos.map(p => p.presion_dinamica_inH2O).filter(v => v != null);
  } else {
    lecturas = (dp_inH2O ?? []).filter(v => v != null);
  }
  if (lecturas.length === 0) return 0;
  return Math.round((lecturas.reduce((a, b) => a + b, 0) / lecturas.length) * 100) / 100;
}

/**
 * 8. Velocidad promedio de gases (m/s) [Datos de Campo G51]
 *    v = 34.97 × 0.84 × √(ΔP_inH2O × 25.4) × √(Ts_K / (Pch_mmHg × PMH))
 */
function calcularVelocidad({ dp_inH2O_avg, temperatura_C, pch_mmHg, pmh }) {
  const ts_K = temperatura_C + 273;
  return 34.97 * 0.84 * Math.sqrt(dp_inH2O_avg * IN_HG_A_MMHG) * Math.sqrt(ts_K / (pch_mmHg * pmh));
}

/**
 * 9. Flujo volumétrico a condiciones normales [Datos de Campo G53]
 *    Qref (m³/h) = 3600 × (1−BWS) × v × Ach × (298/Ts_K) × (Pch/760)
 */
function calcularFlujoVolumetrico({ velocidad_m_s, bws, area_m2, temperatura_C, pch_mmHg }) {
  const ts_K = temperatura_C + 273;
  const qref = 3600 * (1 - bws) * velocidad_m_s * area_m2 * (298 / ts_K) * (pch_mmHg / 760);
  return {
    qref_m3_h:    parseFloat(qref.toFixed(2)),
    qref_ft3_min: parseFloat((qref * 0.5874).toFixed(2)),
  };
}

/**
 * 10. Concentración por analito (mg/m³) [Datos de Campo V43:V51]
 *     C = masa_mg / Vm_m³
 */
function calcularConcentraciones(analitos, vm_m3) {
  return analitos.map(({ nombre, masa_mg }) => {
    const lpc = ANALITOS_LPC[nombre] ?? null;
    return {
      nombre,
      masa_mg,
      lpc_mg:              lpc,
      concentracion_mg_m3: masa_mg / vm_m3,
      por_debajo_lpc:      lpc !== null && masa_mg === lpc,
    };
  });
}

/**
 * 11. Concentración total COVs [Datos de Campo U45]
 */
function calcularCOVsTotal(concentraciones) {
  return concentraciones.reduce((s, a) => s + a.concentracion_mg_m3, 0);
}

/**
 * 12. Emisión por analito (kg/h) [Datos de Campo N69:N86]
 */
function calcularEmisiones(concentraciones, qref_m3_h) {
  return concentraciones.map(a => ({ ...a, emision_kg_h: a.concentracion_mg_m3 * qref_m3_h / 1e6 }));
}

/**
 * 13. Incertidumbre expandida UE [Caratula H22:H30]
 *
 *     Fórmula verificada contra el Excel:
 *       T = UE% / UE_BOMBA_SUCCION
 *       UE_mg = FIXED(C × T, 0) / 100
 *
 *     Bug replicado del Excel para o-Xileno / m,p-Xileno (H26, H27):
 *       H26 (o-xileno)    usa C_m,p-Xileno × T_o-Xileno
 *       H27 (m,p-xileno)  usa C_o-Xileno   × T_m,p-Xileno
 */
function calcularIncertidumbre(concentraciones, norma = 'VID-E-019') {
  const tabla     = norma === 'VID-E-181A' ? INCERTIDUMBRE_VID_E_181A : INCERTIDUMBRE_VID_E_019;
  const c_oXileno  = concentraciones.find(a => a.nombre === 'o-Xileno');
  const c_mpXileno = concentraciones.find(a => a.nombre === 'm,p-Xileno');

  return concentraciones.map(a => {
    const ue_pct = tabla[a.nombre] ?? null;
    if (ue_pct === null) return { ...a, incertidumbre_pct: null, incertidumbre_t: null, incertidumbre_mg_m3: null };

    const t = ue_pct / UE_BOMBA_SUCCION;
    // Cruce de referencias del Excel — replicado intencionalmente
    let c_para_ue = a.concentracion_mg_m3;
    if (a.nombre === 'o-Xileno'   && c_mpXileno) c_para_ue = c_mpXileno.concentracion_mg_m3;
    if (a.nombre === 'm,p-Xileno' && c_oXileno)  c_para_ue = c_oXileno.concentracion_mg_m3;

    return {
      ...a,
      incertidumbre_pct:    ue_pct,
      incertidumbre_t:      parseFloat(t.toFixed(6)),
      incertidumbre_mg_m3:  Math.round(c_para_ue * t) / 100,
    };
  });
}

// ─────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────

function calcularMuestreo(datos) {
  // Extraer sub-documentos del modelo — con alias legacy
  const ch = datos.chimenea            ?? {};
  const mc = datos.medicion_campo      ?? {};
  const bg = datos.bomba               ?? {};
  const cg = datos.composicion_gases   ?? {};

  const altitud     = datos.empresa?.altitud_msnm ?? datos.altitud_msnm;
  const forma       = ch.forma_geometrica         ?? datos.forma_geometrica ?? datos.forma;
  const diametro    = ch.diametro_m               ?? datos.diametro_m;
  const largo       = ch.largo_m                  ?? datos.largo_m;
  const ancho       = ch.ancho_m                  ?? datos.ancho_m;
  const pe          = mc.presion_estatica_inH2O   ?? datos.pe_inH2O ?? 0;
  const temperatura = mc.temperatura_chimenea_C   ?? datos.temperatura_C;
  const tiempo      = mc.tiempo_muestreo_min      ?? datos.tiempo_min;
  const fi          = bg.flujo_inicial_Lmin       ?? datos.flujo_inicial_Lmin;
  const ff          = bg.flujo_final_Lmin         ?? datos.flujo_final_Lmin;
  const fcg         = bg.factor_calibracion_fcg   ?? datos.fcg;
  const O2          = cg.O2_pct                   ?? datos.O2_pct;
  const CO          = cg.CO_ppm                   ?? datos.CO_ppm;
  const CO2         = cg.CO2_pct                  ?? datos.CO2_pct;
  const norma       = datos.norma_limite          ?? 'VID-E-019';
  const analitosInput = datos.masas_laboratorio   ?? datos.analitos ?? [];

  // Impactores: modelo nuevo → determinacion_humedad.impactores; legacy → raíz
  const impactores = _extraerImpactores(datos);

  // ── Cálculos auxiliares ───────────────────────────────
  const verificacionBomba   = verificarCriterioBomba(fi, ff);
  const relacionesDiametros = calcularRelacionesDiametros(
    ch.altura_salida_m, ch.altura_perturbacion_m, ch.altura_entre_puertos_m, diametro);
  const deq = calcularDiametroEquivalente(largo, ancho);

  // ── Cálculos principales ──────────────────────────────
  const { pb_inHg, pb_mmHg } = calcularPresionBarometrica(altitud);
  const presion_conducto_inHg = calcularPresionConducto(pb_inHg, pe);
  const area_m2  = calcularAreaChimenea({ forma_geometrica: forma, diametro_m: diametro, largo_m: largo, ancho_m: ancho });
  const pch_mmHg = calcularPresionAbsoluta(pb_inHg, pe);

  const { flujo_promedio_Lmin, vm_litros, vm_m3 } = calcularVolumenMuestreado({
    flujo_inicial_Lmin: fi, flujo_final_Lmin: ff, factor_calibracion_fcg: fcg, tiempo_min: tiempo,
  });

  const { bws, ptac_g } = calcularHumedad({
    impactores,
    ganancia_imp1_g: datos.ganancia_imp1_g, ganancia_imp2_g: datos.ganancia_imp2_g,
    ganancia_imp3_g: datos.ganancia_imp3_g, ganancia_imp4_g: datos.ganancia_imp4_g,
    temperatura_C: temperatura, pb_inHg, pe_inH2O: pe, vm_litros,
  });

  const { pmh, N2_pct } = calcularPesoMolecular({ O2_pct: O2, CO_ppm: CO, CO2_pct: CO2, bws });
  const dp_avg = calcularDpPromedio({ puntos: mc.puntos ?? null, dp_inH2O: datos.dp_inH2O ?? null });
  const velocidad_m_s = calcularVelocidad({ dp_inH2O_avg: dp_avg, temperatura_C: temperatura, pch_mmHg, pmh });
  const { qref_m3_h, qref_ft3_min } = calcularFlujoVolumetrico({
    velocidad_m_s, bws, area_m2, temperatura_C: temperatura, pch_mmHg,
  });

  let analitos = calcularConcentraciones(analitosInput, vm_m3);
  analitos     = calcularEmisiones(analitos, qref_m3_h);
  analitos     = calcularIncertidumbre(analitos, norma);
  const concentracion_total_COV = calcularCOVsTotal(analitos);

  const validacion_humedad = validarHumedad(bws);
  const validacion_epa18   = validarMuestreoEPA18({
    fraccion_humedad_bws:   bws,
    cumple_criterio_5pct:   verificacionBomba.cumple_criterio_5pct,
    dp_promedio_inH2O:      dp_avg,
  });

  // Serializar con precisión suficiente
  analitos = analitos.map(a => ({
    ...a,
    concentracion_mg_m3: parseFloat(a.concentracion_mg_m3.toFixed(6)),
    emision_kg_h:         parseFloat(a.emision_kg_h.toFixed(8)),
  }));

  return {
    // Alineados con resultadosCalculo schema del modelo
    presion_barometrica_inHg:      parseFloat(pb_inHg.toFixed(6)),
    presion_barometrica_mmHg:      parseFloat(pb_mmHg.toFixed(4)),
    presion_conducto_inHg,                                            // nuevo en schema
    area_chimenea_m2:              parseFloat(area_m2.toFixed(8)),
    presion_absoluta_mmHg:         parseFloat(pch_mmHg.toFixed(6)),
    fraccion_humedad_bws:          parseFloat(bws.toFixed(8)),
    ptac_g:                        parseFloat(ptac_g.toFixed(6)),
    N2_pct:                        parseFloat(N2_pct.toFixed(4)),
    peso_molecular_humedo_g_gmol:  parseFloat(pmh.toFixed(6)),
    dp_promedio_inH2O:             dp_avg,
    flujo_bomba_promedio_Lmin:     parseFloat(flujo_promedio_Lmin.toFixed(6)),
    volumen_muestreado_m3:         parseFloat(vm_m3.toFixed(8)),
    volumen_muestreado_COVs_L:     parseFloat(vm_litros.toFixed(4)),  // nuevo en schema
    velocidad_gases_m_s:           parseFloat(velocidad_m_s.toFixed(6)),
    flujo_vol_m3_h:                qref_m3_h,
    flujo_vol_ft3_min:             qref_ft3_min,
    concentracion_total_COV_mg_m3: parseFloat(concentracion_total_COV.toFixed(6)),
    c1_micropoise:                 -150.3162,                         // constante del Excel F39
    analitos,

    // Extra — para poblar sub-documentos en routes.js
    _extra: {
      deq_m:              deq,
      verificacion_bomba: verificacionBomba,
      validacion_humedad,
      validacion_epa18,
      relaciones_diametros: relacionesDiametros,
      resumen: generarResumenResultados({ velocidad_gases_m_s: velocidad_m_s,
        flujo_vol_m3_h: qref_m3_h, concentracion_total_COV_mg_m3: concentracion_total_COV, analitos }),
    },
  };
}

module.exports = {
  calcularMuestreo,
  calcularPresionBarometrica,
  calcularAreaChimenea,
  calcularPresionAbsoluta,
  calcularVolumenMuestreado,
  calcularHumedad,
  calcularPesoMolecular,
  calcularDpPromedio,
  calcularVelocidad,
  calcularFlujoVolumetrico,
  calcularConcentraciones,
  calcularCOVsTotal,
  calcularEmisiones,
  calcularIncertidumbre,
  calcularPresionConducto,
  calcularDiametroEquivalente,
  calcularRelacionesDiametros,
  verificarCriterioBomba,
  validarHumedad,
  validarMuestreoEPA18,
  calcularDistanciasPuntos,
  generarResumenResultados,
  ANALITOS_LPC,
  INCERTIDUMBRE_VID_E_019,
  INCERTIDUMBRE_VID_E_181A,
  TABLA_KL_CIRCULAR,
  TABLA_KL_DUCTO_PEQUENO,
  UE_BOMBA_SUCCION,
};
 

