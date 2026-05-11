'use strict';

const request = require('supertest');
const app     = require('../../App');

describe('NOM022 — Multímetros', () => {

  // ── GET /api/nom022/multimetros ────────────────────────────────────────

  describe('GET /api/nom022/multimetros', () => {
    it('debe retornar lista de multímetros', async () => {
      const res = await request(app).get('/api/nom022/multimetros');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.multimetros)).toBe(true);
    });
  });

  // ── GET /api/nom022/multimetros/activos ────────────────────────────────

  describe('GET /api/nom022/multimetros/activos', () => {
    it('debe retornar solo multímetros activos', async () => {
      const res = await request(app).get('/api/nom022/multimetros/activos');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.multimetros)).toBe(true);
    });
  });

  // ── POST /api/nom022/multimetros ───────────────────────────────────────

  describe('POST /api/nom022/multimetros', () => {
    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/api/nom022/multimetros')
        .send({ marca: 'Test' });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toBeDefined();
    });

    it('debe retornar 400 si falta modelo', async () => {
      const res = await request(app)
        .post('/api/nom022/multimetros')
        .send({
          marca:             'Test',
          serie_id:          'TEST-001',
          fecha_calibracion: '2025-01-01',
          fecha_vencimiento: '2026-01-01',
        });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toContain('modelo');
    });

    it('debe retornar 400 si falta serie_id', async () => {
      const res = await request(app)
        .post('/api/nom022/multimetros')
        .send({
          marca:             'Test',
          modelo:            'Modelo Test',
          fecha_calibracion: '2025-01-01',
          fecha_vencimiento: '2026-01-01',
        });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toContain('serie_id');
    });
  });

  // ── GET /api/nom022/multimetros/:id ───────────────────────────────────

  describe('GET /api/nom022/multimetros/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).get('/api/nom022/multimetros/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).get('/api/nom022/multimetros/000000000000000000000001');
      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/nom022/multimetros/serie/:serie_id ────────────────────────

  describe('GET /api/nom022/multimetros/serie/:serie_id', () => {
    it('debe retornar 404 si no existe la serie', async () => {
      const res = await request(app).get('/api/nom022/multimetros/serie/SERIE-NO-EXISTE');
      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/nom022/multimetros/:id ────────────────────────────────

  describe('DELETE /api/nom022/multimetros/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).delete('/api/nom022/multimetros/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).delete('/api/nom022/multimetros/000000000000000000000001');
      expect(res.status).toBe(404);
    });
  });

});