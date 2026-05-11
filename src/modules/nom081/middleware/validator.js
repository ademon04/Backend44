'use strict';

// ============================================================================
// SONÓMETRO
// ============================================================================

const validarCrearSonometro = (req, res, next) => {
  const { marca, modelo, serie_id, clase, fecha_calibracion, fecha_vencimiento, certificado, incertidumbre_global } = req.body;

  const faltantes = [];
  if (!marca)                faltantes.push('marca');
  if (!modelo)               faltantes.push('modelo');
  if (!serie_id)             faltantes.push('serie_id');
  if (!clase)                faltantes.push('clase');
  if (!fecha_calibracion)    faltantes.push('fecha_calibracion');
  if (!fecha_vencimiento)    faltantes.push('fecha_vencimiento');
  if (!certificado)          faltantes.push('certificado');
  if (incertidumbre_global === undefined) faltantes.push('incertidumbre_global');

  if (faltantes.length > 0) {
    return res.status(400).json({
      error: 'Campos requeridos faltantes',
      faltantes,
    });
  }

  const clasesValidas = ['Clase 1', 'Clase 2', 'Tipo 1', 'Tipo 2'];
  if (!clasesValidas.includes(clase)) {
    return res.status(400).json({
      error: `Clase inválida. Valores permitidos: ${clasesValidas.join(', ')}`,
    });
  }

  next();
};

// ============================================================================
// CALCULAR
// ============================================================================

const validarCalcular = (req, res, next) => {
  const { zona_tipo, mediciones } = req.body;

  if (!zona_tipo) {
    return res.status(400).json({ error: 'El campo "zona_tipo" es requerido' });
  }

  if (!mediciones || !mediciones.diurno) {
    return res.status(400).json({ error: 'Se requieren mediciones diurnas' });
  }

  next();
};

// ============================================================================
// ESTUDIO
// ============================================================================

const validarCrearEstudio = (req, res, next) => {
  const datos = req.body;

  const required = [
    'numero_informe',
    'orden_servicio',
    'empresa',
    'zona_tipo',
    'fecha_medicion',
    'mediciones',
  ];

  const faltantes = required.filter(f => datos[f] === undefined);

  if (faltantes.length > 0) {
    return res.status(400).json({
      error: 'Campos requeridos faltantes',
      faltantes,
    });
  }

  if (!datos.empresa.razon_social) {
    return res.status(400).json({
      error: 'Datos de empresa incompletos',
      faltantes: ['empresa.razon_social'],
    });
  }

  next();
};

module.exports = {
  validarCrearSonometro,
  validarCalcular,
  validarCrearEstudio,
};