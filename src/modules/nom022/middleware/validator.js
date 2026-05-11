'use strict';

// ============================================================================
// TERRÓMETRO
// ============================================================================

const validarCrearTerrometro = (req, res, next) => {
  const { marca, modelo, serie_id, fecha_calibracion, fecha_vencimiento } = req.body;

  const faltantes = [];
  if (!marca)             faltantes.push('marca');
  if (!modelo)            faltantes.push('modelo');
  if (!serie_id)          faltantes.push('serie_id');
  if (!fecha_calibracion) faltantes.push('fecha_calibracion');
  if (!fecha_vencimiento) faltantes.push('fecha_vencimiento');

  if (faltantes.length > 0) {
    return res.status(400).json({ error: 'Campos requeridos faltantes', faltantes });
  }

  next();
};

// ============================================================================
// MULTÍMETRO
// ============================================================================

const validarCrearMultimetro = (req, res, next) => {
  const { marca, modelo, serie_id, fecha_calibracion, fecha_vencimiento } = req.body;

  const faltantes = [];
  if (!marca)             faltantes.push('marca');
  if (!modelo)            faltantes.push('modelo');
  if (!serie_id)          faltantes.push('serie_id');
  if (!fecha_calibracion) faltantes.push('fecha_calibracion');
  if (!fecha_vencimiento) faltantes.push('fecha_vencimiento');

  if (faltantes.length > 0) {
    return res.status(400).json({ error: 'Campos requeridos faltantes', faltantes });
  }

  next();
};

// ============================================================================
// ESTUDIO
// ============================================================================

const validarCrearEstudio = (req, res, next) => {
  const { numero_informe, orden_servicio, empresa } = req.body;

  const faltantes = [];
  if (!numero_informe) faltantes.push('numero_informe');
  if (!orden_servicio) faltantes.push('orden_servicio');
  if (!empresa)        faltantes.push('empresa');

  if (faltantes.length > 0) {
    return res.status(400).json({ error: 'Campos requeridos faltantes', faltantes });
  }

  if (!empresa.razon_social) {
    return res.status(400).json({
      error:    'Datos de empresa incompletos',
      faltantes: ['empresa.razon_social'],
    });
  }

  next();
};

// ============================================================================
// POZOS
// ============================================================================

const validarAgregarPozos = (req, res, next) => {
  const { pozos } = req.body;

  if (!pozos || !Array.isArray(pozos) || pozos.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un pozo de medición' });
  }

  for (const pozo of pozos) {
    if (!pozo.numero) {
      return res.status(400).json({ error: 'Cada pozo debe tener un número' });
    }

    if (!pozo.sistema || !['Pararrayos', 'Electrodo'].includes(pozo.sistema)) {
      return res.status(400).json({
        error: `El pozo ${pozo.numero} debe tener sistema válido: Pararrayos o Electrodo`,
      });
    }

    if (!pozo.lecturas || !Array.isArray(pozo.lecturas) || pozo.lecturas.length === 0) {
      return res.status(400).json({
        error: `El pozo ${pozo.numero} debe tener al menos una lectura`,
      });
    }

    for (const lectura of pozo.lecturas) {
      if (lectura.distancia_m === undefined || lectura.distancia_m === null) {
        return res.status(400).json({
          error: `El pozo ${pozo.numero} tiene una lectura sin distancia_m`,
        });
      }
      if (lectura.valor_ohm === undefined || lectura.valor_ohm === null) {
        return res.status(400).json({
          error: `El pozo ${pozo.numero} tiene una lectura sin valor_ohm`,
        });
      }
    }
  }

  next();
};

// ============================================================================
// CONTINUIDADES
// ============================================================================

const validarAgregarContinuidades = (req, res, next) => {
  const { continuidades } = req.body;

  if (!continuidades || !Array.isArray(continuidades) || continuidades.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos una continuidad' });
  }

  for (const cont of continuidades) {
    if (!cont.identificacion) {
      return res.status(400).json({
        error: 'Cada continuidad debe tener una identificación',
      });
    }
  }

  next();
};

// ============================================================================
// VERIFICACIÓN
// ============================================================================

const validarVerificacion = (req, res, next) => {
  const {
    resistencia_1ohm_inicial,
    resistencia_10ohm_inicial,
    resistencia_22ohm_inicial,
    resistencia_30ohm_inicial,
    resistencia_1ohm_final,
    resistencia_10ohm_final,
    resistencia_22ohm_final,
    resistencia_30ohm_final,
    verificado_por,
  } = req.body;

  const faltantes = [];
  if (resistencia_1ohm_inicial  === undefined) faltantes.push('resistencia_1ohm_inicial');
  if (resistencia_10ohm_inicial === undefined) faltantes.push('resistencia_10ohm_inicial');
  if (resistencia_22ohm_inicial === undefined) faltantes.push('resistencia_22ohm_inicial');
  if (resistencia_30ohm_inicial === undefined) faltantes.push('resistencia_30ohm_inicial');
  if (resistencia_1ohm_final    === undefined) faltantes.push('resistencia_1ohm_final');
  if (resistencia_10ohm_final   === undefined) faltantes.push('resistencia_10ohm_final');
  if (resistencia_22ohm_final   === undefined) faltantes.push('resistencia_22ohm_final');
  if (resistencia_30ohm_final   === undefined) faltantes.push('resistencia_30ohm_final');
  if (!verificado_por)                         faltantes.push('verificado_por');

  if (faltantes.length > 0) {
    return res.status(400).json({ error: 'Campos requeridos faltantes', faltantes });
  }

  next();
};

module.exports = {
  validarCrearTerrometro,
  validarCrearMultimetro,
  validarCrearEstudio,
  validarAgregarPozos,
  validarAgregarContinuidades,
  validarVerificacion,
};