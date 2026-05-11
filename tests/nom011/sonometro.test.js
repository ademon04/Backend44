'use strict';

const request = require('supertest');
const app     = require('../../App');

describe('NOM011 — Sonómetros Integradores', () => {

  describe('GET /api/nom011/sonometros', () => {
    it('debe retornar lista de sonómetros', async () => {
      const res = await request(app).get('/api/nom011/sonometros');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.sonometros)).toBe(true);
    });
  });

  describe('GET /api/nom011/sonometros/activos', () => {
    it('debe retornar solo sonómetros activos', async () => {
      const res = await request(app).get('/api/nom011/sonometros/activos');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.sonometros)).toBe(true);
    });
  });

  describe('GET /api/nom011/sonometros/vencimiento/proximo', () => {
    it('debe retornar sonómetros por vencer', async () => {
      const res = await request(app).get('/api/nom011/sonometros/vencimiento/proximo?dias=30');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.dias_ventana).toBe(30);
    });
  });

  describe('POST /api/nom011/sonometros', () => {
    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/api/nom011/sonometros')
        .send({ marca: 'BSWA' });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toBeDefined();
    });

    it('debe retornar 400 si falta modelo', async () => {
      const res = await request(app)
        .post('/api/nom011/sonometros')
        .send({
          marca:             'BSWA',
          serie_id:          'TEST-001',
          fecha_calibracion: '2025-01-01',
          fecha_vencimiento: '2026-01-01',
        });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toContain('modelo');
    });

    it('debe retornar 400 si falta serie_id', async () => {
      const res = await request(app)
        .post('/api/nom011/sonometros')
        .send({
          marca:             'BSWA',
          modelo:            'BSWA 309',
          fecha_calibracion: '2025-01-01',
          fecha_vencimiento: '2026-01-01',
        });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toContain('serie_id');
    });
  });

  describe('GET /api/nom011/sonometros/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).get('/api/nom011/sonometros/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).get('/api/nom011/sonometros/000000000000000000000001');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/nom011/sonometros/serie/:serie_id', () => {
    it('debe retornar 404 si no existe la serie', async () => {
      const res = await request(app).get('/api/nom011/sonometros/serie/SERIE-NO-EXISTE');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/nom011/sonometros/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).delete('/api/nom011/sonometros/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).delete('/api/nom011/sonometros/000000000000000000000001');
      expect(res.status).toBe(404);
    });
  });

});