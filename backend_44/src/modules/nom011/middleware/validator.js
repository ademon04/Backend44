'use strict';

// ============================================================================
// SONÓMETRO INTEGRADOR
// ============================================================================

const validarCrearSonometro = (req, res, next) => {
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
// DOSÍMETRO
// ============================================================================

const validarCrearDosimetro = (req, res, next) => {
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
// PUNTOS FIJOS
// ============================================================================

const validarAgregarPuntosFijos = (req, res, next) => {
  const { puntos_fijos } = req.body;

  if (!puntos_fijos || !Array.isArray(puntos_fijos) || puntos_fijos.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un punto de medición' });
  }

  for (const punto of puntos_fijos) {
    if (!punto.numero) {
      return res.status(400).json({ error: 'Cada punto debe tener un número' });
    }

    if (!punto.area) {
      return res.status(400).json({
        error: `El punto ${punto.numero} debe tener un área`,
      });
    }

    if (!punto.tiempo_exposicion_h || punto.tiempo_exposicion_h <= 0) {
      return res.status(400).json({
        error: `El punto ${punto.numero} debe tener tiempo_exposicion_h mayor a 0`,
      });
    }

    if (!punto.jornada_laboral_h || punto.jornada_laboral_h <= 0) {
      return res.status(400).json({
        error: `El punto ${punto.numero} debe tener jornada_laboral_h mayor a 0`,
      });
    }

    if (!punto.lecturas || !Array.isArray(punto.lecturas) || punto.lecturas.length === 0) {
      return res.status(400).json({
        error: `El punto ${punto.numero} debe tener al menos una lectura`,
      });
    }

    for (const lectura of punto.lecturas) {
      if (lectura.nscea_t === undefined || lectura.nscea_t === null) {
        return res.status(400).json({
          error: `El punto ${punto.numero} tiene una lectura sin nscea_t`,
        });
      }
    }
  }

  next();
};

// ============================================================================
// DOSIMETRÍAS
// ============================================================================

const validarAgregarDosimetrias = (req, res, next) => {
  const { dosimetrias } = req.body;

  if (!dosimetrias || !Array.isArray(dosimetrias) || dosimetrias.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos una dosimetría' });
  }

  for (const dosis of dosimetrias) {
    if (!dosis.numero) {
      return res.status(400).json({ error: 'Cada dosimetría debe tener un número' });
    }

    if (!dosis.area) {
      return res.status(400).json({
        error: `La dosimetría ${dosis.numero} debe tener un área`,
      });
    }

    if (!dosis.nombre_trabajador) {
      return res.status(400).json({
        error: `La dosimetría ${dosis.numero} debe tener nombre_trabajador`,
      });
    }

    if (dosis.porcentaje_dosis_final === undefined || dosis.porcentaje_dosis_final === null) {
      return res.status(400).json({
        error: `La dosimetría ${dosis.numero} debe tener porcentaje_dosis_final`,
      });
    }

    if (!dosis.tiempo_medicion_h || dosis.tiempo_medicion_h <= 0) {
      return res.status(400).json({
        error: `La dosimetría ${dosis.numero} debe tener tiempo_medicion_h mayor a 0`,
      });
    }

    if (!dosis.jornada_laboral_h || dosis.jornada_laboral_h <= 0) {
      return res.status(400).json({
        error: `La dosimetría ${dosis.numero} debe tener jornada_laboral_h mayor a 0`,
      });
    }
  }

  next();
};

module.exports = {
  validarCrearSonometro,
  validarCrearDosimetro,
  validarCrearEstudio,
  validarAgregarPuntosFijos,
  validarAgregarDosimetrias,
};