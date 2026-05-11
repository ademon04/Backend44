'use strict';

const request = require('supertest');
const app     = require('../../App');

describe('NOM081 — Sonómetros', () => {

  // ── GET /api/nom081/sonometros ─────────────────────────────────────────

  describe('GET /api/nom081/sonometros', () => {
    it('debe retornar lista de sonómetros', async () => {
      const res = await request(app).get('/api/nom081/sonometros');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.sonometros)).toBe(true);
    });
  });

  // ── GET /api/nom081/sonometros/activos ─────────────────────────────────

  describe('GET /api/nom081/sonometros/activos', () => {
    it('debe retornar solo sonómetros activos', async () => {
      const res = await request(app).get('/api/nom081/sonometros/activos');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.sonometros)).toBe(true);
    });
  });

  // ── GET /api/nom081/sonometros/buscar/query ────────────────────────────

  describe('GET /api/nom081/sonometros/buscar/query', () => {
    it('debe buscar sonómetros por query', async () => {
      const res = await request(app).get('/api/nom081/sonometros/buscar/query?q=test');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.sonometros)).toBe(true);
    });
  });

  // ── GET /api/nom081/sonometros/vencimiento/proximo ─────────────────────

  describe('GET /api/nom081/sonometros/vencimiento/proximo', () => {
    it('debe retornar sonómetros por vencer en 30 días', async () => {
      const res = await request(app).get('/api/nom081/sonometros/vencimiento/proximo?dias=30');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.dias_ventana).toBe(30);
    });
  });

  // ── POST /api/nom081/sonometros ────────────────────────────────────────

  describe('POST /api/nom081/sonometros', () => {
    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/api/nom081/sonometros')
        .send({ marca: 'Test' });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toBeDefined();
    });

    it('debe retornar 400 si falta clase', async () => {
      const res = await request(app)
        .post('/api/nom081/sonometros')
        .send({
          marca:                'Test',
          modelo:               'Modelo Test',
          serie_id:             'TEST-001',
          fecha_calibracion:    '2025-01-01',
          fecha_vencimiento:    '2026-01-01',
          certificado:          'CERT-001',
          incertidumbre_global: 0.3,
        });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toContain('clase');
    });

    it('debe retornar 400 si clase es inválida', async () => {
      const res = await request(app)
        .post('/api/nom081/sonometros')
        .send({
          marca:                'Test',
          modelo:               'Modelo Test',
          serie_id:             'TEST-001',
          clase:                'Clase Invalida',
          fecha_calibracion:    '2025-01-01',
          fecha_vencimiento:    '2026-01-01',
          certificado:          'CERT-001',
          incertidumbre_global: 0.3,
        });
      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/nom081/sonometros/:id ─────────────────────────────────────

  describe('GET /api/nom081/sonometros/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).get('/api/nom081/sonometros/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).get('/api/nom081/sonometros/000000000000000000000001');
      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/nom081/sonometros/serie/:serie_id ─────────────────────────

  describe('GET /api/nom081/sonometros/serie/:serie_id', () => {
    it('debe retornar 404 si no existe la serie', async () => {
      const res = await request(app).get('/api/nom081/sonometros/serie/SERIE-NO-EXISTE');
      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/nom081/sonometros/:id ──────────────────────────────────

  describe('DELETE /api/nom081/sonometros/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).delete('/api/nom081/sonometros/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).delete('/api/nom081/sonometros/000000000000000000000001');
      expect(res.status).toBe(404);
    });
  });

});