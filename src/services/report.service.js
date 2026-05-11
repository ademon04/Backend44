// src/services/report.service.js
'use strict';

const PDFGenerator = require('../shared/pdf/generator');

class ReportService {
  async generate(moduleName, data, options = {}) {
    const generator = new PDFGenerator(moduleName, data, options);
    return await generator.generate();
  }
}

module.exports = new ReportService();