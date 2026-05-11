'use strict';

const config = require('../../config/pdf.config');
const styles = require('./styles');

class BaseTemplate {
  
  static getModuleName() {
    throw new Error('getModuleName debe ser implementado');
  }
  
  static getSubject() {
    throw new Error('getSubject debe ser implementado');
  }
  
  static getKeywords() {
    return [];
  }
  
  static async header(doc, data, pageNum, totalPages) {
    const y = doc.page.margins.top;
    
    doc.fontSize(styles.fonts.caption.size);
    doc.font('Helvetica');
    doc.fillColor(styles.colors.gray);
    doc.text(config.company.name, 50, y - 20, { align: 'center' });
    
    doc.moveTo(50, y - 10).lineTo(550, y - 10).stroke();
    
    doc.fontSize(styles.fonts.small.size);
    doc.font('Helvetica-Bold');
    doc.fillColor(styles.colors.primary);
    doc.text(this.getModuleName(), 50, y, { align: 'center' });
    
    doc.fillColor(styles.colors.black);
  }
  
  static async footer(doc, data, pageNum, totalPages) {
    const y = doc.page.height - doc.page.margins.bottom;
    
    doc.fontSize(styles.fonts.caption.size);
    doc.font('Helvetica');
    doc.fillColor(styles.colors.gray);
    doc.text(config.company.address, 50, y - 20, { align: 'center' });
    doc.text(`Tel: ${config.company.phone} | Página ${pageNum} de ${totalPages}`, 50, y - 10, { align: 'center' });
    
    doc.fillColor(styles.colors.black);
  }
  
  static async coverPage(doc, data) {
    throw new Error('coverPage debe ser implementado');
  }
  
  static async content(doc, data) {
    throw new Error('content debe ser implementado');
  }
  
  static async generate(doc, data) {
    await this.coverPage(doc, data);
    doc.addPage();
    await this.content(doc, data);
  }
  
  static async addPageNumbers(doc) {
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      await this.footer(doc, null, i + 1, totalPages);
    }
  }
}

module.exports = BaseTemplate;