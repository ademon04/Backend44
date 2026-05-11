// src/shared/pdf/generator.js
'use strict';

const PDFDocument = require('pdfkit');

class PDFGenerator {
  constructor(moduleName, data, options = {}) {
    this.moduleName = moduleName;
    this.data = data;
    this.options = options;
  }

  async generate() {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        
        // Portada simple
        doc.fontSize(16);
        doc.text('INFORME DE RESULTADOS', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Folio: ${this.data.folio || 'N/A'}`, { align: 'center' });
        doc.text(`Empresa: ${this.data.empresa?.razon_social || 'N/A'}`, { align: 'center' });
        doc.text(`Orden de Servicio: ${this.data.orden_servicio || 'N/A'}`, { align: 'center' });
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFGenerator;