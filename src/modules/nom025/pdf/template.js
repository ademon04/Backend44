'use strict';

const { BaseTemplate } = require('../../../shared/pdf');
const moment = require('moment');

class NOM025Template extends BaseTemplate {
  
  static getModuleName() {
    return 'NORMA Oficial Mexicana NOM-025-STPS-2008';
  }
  
  static getSubject() {
    return 'Evaluación de los niveles de iluminación y reflexión';
  }
  
  static async coverPage(doc, data) {
    doc.fontSize(16);
    doc.font('Helvetica-Bold');
    doc.text('INFORME DE RESULTADOS', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(this.getModuleName(), { align: 'center' });
    doc.text(this.getSubject(), { align: 'center' });
    doc.moveDown(2);
    
    doc.fontSize(14);
    doc.text(`No. de Informe: ${data.folio || 'N/A'}`, { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(10);
    doc.text(`Orden de Servicio: ${data.orden_servicio || 'N/A'}`, { align: 'center' });
    doc.text(`Reconocimiento Inicial: ${moment(data.fecha_reconocimiento).format('DD/MM/YYYY')}`, { align: 'center' });
    doc.text(`Evaluación: ${moment(data.fecha_medicion).format('DD/MM/YYYY')}`, { align: 'center' });
    doc.text(`Elaboración del Informe: ${moment(data.fecha_informe).format('DD/MM/YYYY')}`, { align: 'center' });
    doc.moveDown(3);
    
    doc.fontSize(11);
    doc.text(data.empresa?.razon_social || 'Empresa no especificada', { align: 'center' });
    doc.text(data.empresa?.direccion || '', { align: 'center' });
    doc.moveDown(4);
    
    doc.fontSize(10);
    doc.text('M. en C. Vidal Loera Yebra', { align: 'center' });
    doc.text('Responsable de Laboratorio', { align: 'center' });
  }
  
  static async content(doc, data) {
    await this.generalInfo(doc, data);
    doc.addPage();
    await this.resultsTable(doc, data);
    doc.addPage();
    await this.conclusions(doc, data);
    doc.addPage();
    await this.calibrationCertificate(doc, data);
  }
  
  static async generalInfo(doc, data) {
    doc.fontSize(14);
    doc.font('Helvetica-Bold');
    doc.text('Datos Generales de la Evaluación', { underline: true });
    doc.moveDown();
    
    doc.fontSize(10);
    doc.font('Helvetica');
    
    let y = doc.y;
    
    doc.text('Equipo utilizado:', 50, y);
    doc.text(`Luxómetro ${data.luxometro?.marca || 'N/A'} ${data.luxometro?.modelo || ''}`, 180, y);
    doc.text(`Serie: ${data.luxometro?.serie_id || 'N/A'}`, 350, y);
    
    doc.text('Certificado:', 50, y + 20);
    doc.text(data.luxometro?.certificado || 'N/A', 180, y + 20);
    
    doc.text('Incertidumbre:', 50, y + 40);
    doc.text(`±${(data.luxometro?.u_relativa || 0.0366) * 100}% (k=2, 95% confianza)`, 180, y + 40);
    
    doc.text('Método de evaluación:', 50, y + 60);
    doc.text(data.metodo || 'NOM-025-STPS-2008', 180, y + 60);
    
    doc.moveDown(6);
  }
  
  static async resultsTable(doc, data) {
    doc.fontSize(12);
    doc.font('Helvetica-Bold');
    doc.text('Resultados de la Evaluación', { underline: true });
    doc.moveDown();
    
    const cols = {
      punto: { x: 50, w: 40, label: 'Punto', align: 'center' },
      ubicacion: { x: 90, w: 130, label: 'Ubicación', align: 'left' },
      hora: { x: 220, w: 50, label: 'Hora', align: 'center' },
      lux: { x: 270, w: 70, label: 'Lux Corregido', align: 'right' },
      kf: { x: 340, w: 60, label: 'Kf (%)', align: 'center' },
      ue: { x: 400, w: 60, label: 'UE (Lux)', align: 'center' },
      cumple: { x: 460, w: 50, label: 'Cumple', align: 'center' }
    };
    
    let y = doc.y;
    
    doc.fontSize(8);
    doc.font('Helvetica-Bold');
    Object.values(cols).forEach(col => {
      doc.text(col.label, col.x, y, { width: col.w, align: col.align });
    });
    
    y += 15;
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 5;
    
    doc.font('Helvetica');
    doc.fontSize(8);
    
    for (const punto of (data.puntos || [])) {
      for (let i = 0; i < (punto.lecturas || []).length; i++) {
        const lectura = punto.lecturas[i];
        
        if (y > 700) {
          doc.addPage();
          y = 50;
          await this.resultsHeader(doc, cols);
        }
        
        doc.text(i === 0 ? punto.numero.toString() : '', cols.punto.x, y, { width: cols.punto.w, align: cols.punto.align });
        doc.text(i === 0 ? (punto.ubicacion?.substring(0, 25) || '') : '', cols.ubicacion.x, y, { width: cols.ubicacion.w, align: cols.ubicacion.align });
        doc.text(lectura.hora || '---', cols.hora.x, y, { width: cols.hora.w, align: cols.hora.align });
        doc.text(lectura.lux_corregido?.toFixed(1) || '---', cols.lux.x, y, { width: cols.lux.w, align: cols.lux.align });
        doc.text(lectura.kf_plano?.toFixed(1) || '---', cols.kf.x, y, { width: cols.kf.w, align: cols.kf.align });
        doc.text(lectura.ue ? `±${lectura.ue.toFixed(1)}` : '---', cols.ue.x, y, { width: cols.ue.w, align: cols.ue.align });
        
        const cumpleText = punto.cumple_total ? '✓' : '✗';
        const cumpleColor = punto.cumple_total ? '#27ae60' : '#e74c3c';
        doc.fillColor(cumpleColor);
        doc.text(cumpleText, cols.cumple.x, y, { width: cols.cumple.w, align: cols.cumple.align });
        doc.fillColor('#000000');
        
        y += 12;
      }
    }
  }
  
  static async resultsHeader(doc, cols) {
    doc.font('Helvetica-Bold');
    Object.values(cols).forEach(col => {
      doc.text(col.label, col.x, doc.y, { width: col.w, align: col.align });
    });
    doc.moveTo(50, doc.y + 15).lineTo(545, doc.y + 15).stroke();
  }
  
  static async conclusions(doc, data) {
    doc.fontSize(12);
    doc.font('Helvetica-Bold');
    doc.text('Conclusiones', { underline: true });
    doc.moveDown();
    
    const resultados = data.resultados || {};
    const conclusion = resultados.conclusion_general || 'NO DETERMINADO';
    const color = conclusion === 'CUMPLE' ? '#27ae60' : 
                  conclusion === 'CUMPLE PARCIALMENTE' ? '#f39c12' : '#e74c3c';
    
    doc.fontSize(16);
    doc.fillColor(color);
    doc.text(conclusion, { align: 'center' });
    doc.fillColor('#000000');
    doc.moveDown();
    
    doc.fontSize(10);
    doc.font('Helvetica');
    doc.text(`Porcentaje de cumplimiento: ${resultados.porcentaje_cumplimiento || 0}%`, { align: 'center' });
    doc.text(`Puntos evaluados: ${resultados.total_puntos_medidos || 0}`, { align: 'center' });
    doc.text(`Puntos que cumplen: ${resultados.total_puntos_cumplen || 0}`, { align: 'center' });
    
    if (resultados.puntos_fallidos?.length > 0) {
      doc.moveDown();
      doc.fillColor('#e74c3c');
      doc.text(`Puntos que no cumplen: ${resultados.puntos_fallidos.join(', ')}`, { align: 'center' });
      doc.fillColor('#000000');
    }
    
    doc.moveDown(2);
    doc.fontSize(8);
    doc.text(resultados.regla_decision || '', { align: 'justify' });
  }
  
  static async calibrationCertificate(doc, data) {
    doc.fontSize(12);
    doc.font('Helvetica-Bold');
    doc.text('Certificado de Calibración del Equipo', { underline: true });
    doc.moveDown();
    
    const factores = data.luxometro?.factores_correccion || [];
    
    if (factores.length === 0) {
      doc.text('No hay factores de corrección registrados', { align: 'center' });
      return;
    }
    
    doc.fontSize(9);
    doc.font('Helvetica');
    
    let y = doc.y;
    
    doc.font('Helvetica-Bold');
    doc.text('Iluminancia Ref. (lx)', 50, y, { width: 150, align: 'center' });
    doc.text('Factor', 200, y, { width: 150, align: 'center' });
    doc.text('Promedio', 350, y, { width: 150, align: 'center' });
    
    y += 15;
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 5;
    
    doc.font('Helvetica');
    for (const f of factores) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      
      doc.text(f.iluminancia_ref.toFixed(2), 50, y, { width: 150, align: 'center' });
      doc.text(f.factor.toFixed(4), 200, y, { width: 150, align: 'center' });
      doc.text(f.promedio.toFixed(2), 350, y, { width: 150, align: 'center' });
      
      y += 15;
    }
  }
}

module.exports = NOM025Template;