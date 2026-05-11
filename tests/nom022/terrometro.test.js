'use strict';

const request = require('supertest');
const app     = require('../../App');

describe('NOM022 — Terrómetros', () => {

  // ── GET /api/nom022/terrometros ────────────────────────────────────────

  describe('GET /api/nom022/terrometros', () => {
    it('debe retornar lista de terrómetros', async () => {
      const res = await request(app).get('/api/nom022/terrometros');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.terrometros)).toBe(true);
    });
  });

  // ── GET /api/nom022/terrometros/activos ────────────────────────────────

  describe('GET /api/nom022/terrometros/activos', () => {
    it('debe retornar solo terrómetros activos', async () => {
      const res = await request(app).get('/api/nom022/terrometros/activos');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.terrometros)).toBe(true);
    });
  });

  // ── GET /api/nom022/terrometros/buscar/query ───────────────────────────

  describe('GET /api/nom022/terrometros/buscar/query', () => {
    it('debe buscar terrómetros por query', async () => {
      const res = await request(app).get('/api/nom022/terrometros/buscar/query?q=test');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.terrometros)).toBe(true);
    });
  });

  // ── GET /api/nom022/terrometros/vencimiento/proximo ────────────────────

  describe('GET /api/nom022/terrometros/vencimiento/proximo', () => {
    it('debe retornar terrómetros por vencer en 30 días', async () => {
      const res = await request(app).get('/api/nom022/terrometros/vencimiento/proximo?dias=30');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.dias_ventana).toBe(30);
    });
  });

  // ── POST /api/nom022/terrometros ───────────────────────────────────────

  describe('POST /api/nom022/terrometros', () => {
    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/api/nom022/terrometros')
        .send({ marca: 'Test' });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toBeDefined();
    });

    it('debe retornar 400 si falta modelo', async () => {
      const res = await request(app)
        .post('/api/nom022/terrometros')
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
        .post('/api/nom022/terrometros')
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

  // ── GET /api/nom022/terrometros/:id ───────────────────────────────────

  describe('GET /api/nom022/terrometros/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).get('/api/nom022/terrometros/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).get('/api/nom022/terrometros/000000000000000000000001');
      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/nom022/terrometros/serie/:serie_id ────────────────────────

  describe('GET /api/nom022/terrometros/serie/:serie_id', () => {
    it('debe retornar 404 si no existe la serie', async () => {
      const res = await request(app).get('/api/nom022/terrometros/serie/SERIE-NO-EXISTE');
      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/nom022/terrometros/:id ────────────────────────────────

  describe('DELETE /api/nom022/terrometros/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).delete('/api/nom022/terrometros/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).delete('/api/nom022/terrometros/000000000000000000000001');
      expect(res.status).toBe(404);
    });
  });

});