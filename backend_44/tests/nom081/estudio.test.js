'use strict';

const request = require('supertest');
const app     = require('../../App');

const ESTUDIO_ID_VALIDO = '000000000000000000000001';

describe('NOM081 — Estudios', () => {

  // ── GET /api/nom081/estudios ───────────────────────────────────────────

  describe('GET /api/nom081/estudios', () => {
    it('debe retornar lista de estudios', async () => {
      const res = await request(app).get('/api/nom081/estudios');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.estudios)).toBe(true);
    });

    it('debe filtrar por orden de servicio', async () => {
      const res = await request(app).get('/api/nom081/estudios?orden_servicio=OS-001');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  // ── POST /api/nom081/estudios ──────────────────────────────────────────

  describe('POST /api/nom081/estudios', () => {
   it('debe retornar 400 si falta empresa.razon_social', async () => {
  const res = await request(app)
    .post('/api/nom081/estudios')
    .send({
      numero_informe: 'TEST-001',
      orden_servicio: 'OS-001',
      zona_tipo:      'Industrial y Comercial',
      fecha_medicion: '2025-01-01',
      mediciones:     { diurno: { fuente: {}, fondo: {} } },
      empresa:        {},
    });
  expect(res.status).toBe(400);
  expect(res.body.faltantes).toContain('empresa.razon_social');
});

    it('debe retornar 400 si falta zona_tipo', async () => {
      const res = await request(app)
        .post('/api/nom081/estudios')
        .send({
          numero_informe: 'TEST-001',
          orden_servicio: 'OS-001',
          empresa:        { razon_social: 'Empresa Test' },
        });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toContain('zona_tipo');
    });

    it('debe retornar 400 si zona_tipo es inválida', async () => {
      const res = await request(app)
        .post('/api/nom081/estudios')
        .send({
          numero_informe: 'TEST-001',
          orden_servicio: 'OS-001',
          zona_tipo:      'Zona Invalida',
          empresa:        { razon_social: 'Empresa Test' },
        });
      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/nom081/estudios/:id ───────────────────────────────────────

  describe('GET /api/nom081/estudios/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).get('/api/nom081/estudios/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).get(`/api/nom081/estudios/${ESTUDIO_ID_VALIDO}`);
      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/nom081/estudios/informe/:numero ───────────────────────────

  describe('GET /api/nom081/estudios/informe/:numero', () => {
    it('debe retornar 404 si no existe el informe', async () => {
      const res = await request(app).get('/api/nom081/estudios/informe/NO-EXISTE-001');
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/nom081/estudios/:id/calcular ─────────────────────────────

 describe('PUT /api/nom081/estudios/:id/recalcular', () => {
  it('debe retornar 404 si el estudio no existe', async () => {
    const res = await request(app)
      .put(`/api/nom081/estudios/${ESTUDIO_ID_VALIDO}/recalcular`);
    expect(res.status).toBe(404);
  });

  it('debe retornar 400 con ID inválido', async () => {
    const res = await request(app)
      .put('/api/nom081/estudios/id-invalido/recalcular');
    expect(res.status).toBe(400);
  });
});

  // ── DELETE /api/nom081/estudios/:id ───────────────────────────────────

  describe('DELETE /api/nom081/estudios/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).delete('/api/nom081/estudios/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).delete(`/api/nom081/estudios/${ESTUDIO_ID_VALIDO}`);
      expect(res.status).toBe(404);
    });
  });

});