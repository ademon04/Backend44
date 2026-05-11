'use strict';

module.exports = {
  // Configuración general
  defaultFormat: 'A4',
  defaultOrientation: 'portrait',
  defaultMargin: 50,
  
  // Datos de la empresa 
  company: {
    name: '',
    shortName: 'VIDESA',
    address: '',
    phone: '',
    email: '',
    website: ''
  },
  
  // Módulos registrados
  modules: ['nom025', 'nom026', 'nom081'],
  
  // Opciones por defecto por módulo
  defaults: {
    nom025: {
      subject: 'Evaluación de los niveles de iluminación y reflexión',
      keywords: ['NOM-025', 'Iluminación', 'STPS', 'Lux', 'Reflexión']
    },
    nom026: {
      subject: 'Evaluación de los niveles de ruido',
      keywords: ['NOM-026', 'Ruido', 'STPS', 'Decibeles']
    },
    nom081: {
      subject: 'Evaluación de condiciones de seguridad',
      keywords: ['NOM-081', 'Seguridad', 'STPS']
    }
  }
};