'use strict';

// ============================================================================
// LUXÓMETRO
// ============================================================================

const validarCrearLuxometro = (req, res, next) => {
  const { marca, modelo, serie_id, fecha_calibracion, fecha_vencimiento } = req.body;

  const faltantes = [];
  if (!marca)             faltantes.push('marca');
  if (!modelo)            faltantes.push('modelo');
  if (!serie_id)          faltantes.push('serie_id');
  if (!fecha_calibracion) faltantes.push('fecha_calibracion');
  if (!fecha_vencimiento) faltantes.push('fecha_vencimiento');

  if (faltantes.length > 0) {
    return res.status(400).json({
      error: 'Campos requeridos faltantes',
      faltantes,
    });
  }

  next();
};

// ============================================================================
// ESTUDIO
// ============================================================================

const validarCrearEstudio = (req, res, next) => {
  const { folio, orden_servicio, empresa } = req.body;

  const faltantes = [];
  if (!folio)          faltantes.push('folio');
  if (!orden_servicio) faltantes.push('orden_servicio');
  if (!empresa)        faltantes.push('empresa');

  if (faltantes.length > 0) {
    return res.status(400).json({
      error: 'Campos requeridos faltantes',
      faltantes,
    });
  }

  if (!empresa.razon_social) {
    return res.status(400).json({
      error: 'Datos de empresa incompletos',
      faltantes: ['empresa.razon_social'],
    });
  }

  next();
};

// ============================================================================
// ÁREA
// ============================================================================

const validarAgregarArea = (req, res, next) => {
  const { nombre, dimension_largo, dimension_ancho, altura_montaje, nmi_requerido } = req.body;

  const faltantes = [];
  if (!nombre)           faltantes.push('nombre');
  if (!dimension_largo)  faltantes.push('dimension_largo');
  if (!dimension_ancho)  faltantes.push('dimension_ancho');
  if (!altura_montaje)   faltantes.push('altura_montaje');
  if (!nmi_requerido)    faltantes.push('nmi_requerido');

  if (faltantes.length > 0) {
    return res.status(400).json({
      error: 'Campos requeridos faltantes',
      faltantes,
    });
  }

  next();
};

// ============================================================================
// PUNTOS
// ============================================================================

const validarAgregarPuntos = (req, res, next) => {
  const { area_id, puntos } = req.body;

  if (!area_id) {
    return res.status(400).json({ error: 'El campo "area_id" es requerido' });
  }

  if (!puntos || !Array.isArray(puntos) || puntos.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un punto de medición' });
  }

  for (const punto of puntos) {
    if (!punto.numero) {
      return res.status(400).json({ error: 'Cada punto debe tener un número' });
    }
    if (!punto.lecturas || punto.lecturas.length === 0) {
      return res.status(400).json({
        error: `El punto ${punto.numero} debe tener al menos una lectura`,
      });
    }
    for (const lectura of punto.lecturas) {
      if (lectura.lux_medido === undefined || lectura.lux_medido === null) {
        return res.status(400).json({
          error: `El punto ${punto.numero} tiene una lectura sin lux_medido`,
        });
      }
    }
  }

  next();
};

// ============================================================================
// VERIFICACIÓN
// ============================================================================

const validarVerificacion = (req, res, next) => {
  const { lectura_inicial, lectura_final, verificado_por } = req.body;

  const faltantes = [];
  if (lectura_inicial === undefined) faltantes.push('lectura_inicial');
  if (lectura_final   === undefined) faltantes.push('lectura_final');
  if (!verificado_por)               faltantes.push('verificado_por');

  if (faltantes.length > 0) {
    return res.status(400).json({
      error: 'Campos requeridos faltantes',
      faltantes,
    });
  }

  next();
};

module.exports = {
  validarCrearLuxometro,
  validarCrearEstudio,
  validarAgregarArea,
  validarAgregarPuntos,
  validarVerificacion,
};