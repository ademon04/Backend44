'use strict';

const request = require('supertest');
const app     = require('../../App');

describe('NOM025 — Luxómetros', () => {

  // ── GET /api/nom025/luxometros ──────────────────────────────────────────

  describe('GET /api/nom025/luxometros', () => {
    it('debe retornar lista de luxómetros', async () => {
      const res = await request(app).get('/api/nom025/luxometros');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.luxometros)).toBe(true);
    });
  });

  // ── GET /api/nom025/luxometros/activos ──────────────────────────────────

  describe('GET /api/nom025/luxometros/activos', () => {
    it('debe retornar solo luxómetros activos', async () => {
      const res = await request(app).get('/api/nom025/luxometros/activos');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.luxometros)).toBe(true);
    });
  });

  // ── GET /api/nom025/luxometros/buscar/query ─────────────────────────────

  describe('GET /api/nom025/luxometros/buscar/query', () => {
    it('debe buscar luxómetros por query', async () => {
      const res = await request(app).get('/api/nom025/luxometros/buscar/query?q=test');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.luxometros)).toBe(true);
    });
  });

  // ── GET /api/nom025/luxometros/vencimiento/proximo ──────────────────────

  describe('GET /api/nom025/luxometros/vencimiento/proximo', () => {
    it('debe retornar luxómetros por vencer en 30 días', async () => {
      const res = await request(app).get('/api/nom025/luxometros/vencimiento/proximo?dias=30');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.dias_ventana).toBe(30);
    });
  });

  // ── POST /api/nom025/luxometros ─────────────────────────────────────────

  describe('POST /api/nom025/luxometros', () => {
    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/api/nom025/luxometros')
        .send({ marca: 'Test' });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toBeDefined();
    });

    it('debe retornar 400 si falta modelo', async () => {
      const res = await request(app)
        .post('/api/nom025/luxometros')
        .send({
          marca:             'Test',
          serie_id:          'TEST-001',
          fecha_calibracion: '2025-01-01',
          fecha_vencimiento: '2026-01-01',
        });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toContain('modelo');
    });
  });

  // ── GET /api/nom025/luxometros/:id ─────────────────────────────────────

  describe('GET /api/nom025/luxometros/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).get('/api/nom025/luxometros/id-invalido');
      expect(res.status).toBe(400);
    });
  });

});