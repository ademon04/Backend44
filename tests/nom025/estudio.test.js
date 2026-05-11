'use strict';

const request = require('supertest');
const app     = require('../../App');

// ID de un estudio existente en tu BD local
// Cámbialo por uno real de tu BD
const ESTUDIO_ID_VALIDO   = '000000000000000000000001';
const LUXOMETRO_ID_VALIDO = '000000000000000000000001';

describe('NOM025 — Estudios', () => {

  // ── GET /api/nom025/estudios ────────────────────────────────────────────

  describe('GET /api/nom025/estudios', () => {
    it('debe retornar lista de estudios', async () => {
      const res = await request(app).get('/api/nom025/estudios');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.datos)).toBe(true);
    });

    it('debe filtrar por estado', async () => {
      const res = await request(app).get('/api/nom025/estudios?estado=calculado');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.datos)).toBe(true);
    });

    it('debe paginar correctamente', async () => {
      const res = await request(app).get('/api/nom025/estudios?limit=5&skip=0');
      expect(res.status).toBe(200);
      expect(res.body.limit).toBe(5);
    });
  });

  // ── POST /api/nom025/estudios ───────────────────────────────────────────

  describe('POST /api/nom025/estudios', () => {
    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/api/nom025/estudios')
        .send({ folio: 'TEST-001' });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toBeDefined();
    });

    it('debe retornar 400 si falta empresa.razon_social', async () => {
      const res = await request(app)
        .post('/api/nom025/estudios')
        .send({
          folio:          'TEST-001',
          orden_servicio: 'OS-001',
          empresa:        {},
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/empresa/i);
    });

    it('debe retornar 400 si falta orden_servicio', async () => {
      const res = await request(app)
        .post('/api/nom025/estudios')
        .send({
          folio:   'TEST-001',
          empresa: { razon_social: 'Empresa Test' },
        });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toContain('orden_servicio');
    });
  });

  // ── GET /api/nom025/estudios/:id ────────────────────────────────────────

  describe('GET /api/nom025/estudios/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).get('/api/nom025/estudios/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).get(`/api/nom025/estudios/${ESTUDIO_ID_VALIDO}`);
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/nom025/estudios/:id/areas ────────────────────────────────

  describe('POST /api/nom025/estudios/:id/areas', () => {
    it('debe retornar 400 si faltan campos del área', async () => {
      const res = await request(app)
        .post(`/api/nom025/estudios/${ESTUDIO_ID_VALIDO}/areas`)
        .send({ nombre: 'Área Test' });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toBeDefined();
    });

    it('debe retornar 404 si el estudio no existe', async () => {
      const res = await request(app)
        .post(`/api/nom025/estudios/${ESTUDIO_ID_VALIDO}/areas`)
        .send({
          nombre:          'Área Test',
          dimension_largo: 10,
          dimension_ancho: 8,
          altura_montaje:  3,
          nmi_requerido:   300,
        });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/nom025/estudios/:id/puntos ───────────────────────────────

  describe('POST /api/nom025/estudios/:id/puntos', () => {
    it('debe retornar 400 si falta area_id', async () => {
      const res = await request(app)
        .post(`/api/nom025/estudios/${ESTUDIO_ID_VALIDO}/puntos`)
        .send({ puntos: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/area_id/i);
    });

    it('debe retornar 400 si puntos está vacío', async () => {
      const res = await request(app)
        .post(`/api/nom025/estudios/${ESTUDIO_ID_VALIDO}/puntos`)
        .send({ area_id: '000000000000000000000001', puntos: [] });
      expect(res.status).toBe(400);
    });

    it('debe retornar 400 si un punto no tiene lux_medido', async () => {
      const res = await request(app)
        .post(`/api/nom025/estudios/${ESTUDIO_ID_VALIDO}/puntos`)
        .send({
          area_id: '000000000000000000000001',
          puntos: [{
            numero:   1,
            lecturas: [{ hora: '10:00' }],
          }],
        });
      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/nom025/estudios/:id/verificacion ─────────────────────────

  describe('POST /api/nom025/estudios/:id/verificacion', () => {
    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post(`/api/nom025/estudios/${ESTUDIO_ID_VALIDO}/verificacion`)
        .send({ lectura_inicial: 100 });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toBeDefined();
    });

    it('debe retornar 404 si el estudio no existe', async () => {
      const res = await request(app)
        .post(`/api/nom025/estudios/${ESTUDIO_ID_VALIDO}/verificacion`)
        .send({
          lectura_inicial: 100,
          lectura_final:   98,
          verificado_por:  'Ingeniero Test',
        });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/nom025/estudios/:id/calcular ─────────────────────────────

  describe('POST /api/nom025/estudios/:id/calcular', () => {
    it('debe retornar 404 si el estudio no existe', async () => {
      const res = await request(app)
        .post(`/api/nom025/estudios/${ESTUDIO_ID_VALIDO}/calcular`);
      expect(res.status).toBe(404);
    });

    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app)
        .post('/api/nom025/estudios/id-invalido/calcular');
      expect(res.status).toBe(400);
    });
  });

});