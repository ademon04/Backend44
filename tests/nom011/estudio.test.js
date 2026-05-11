'use strict';

const request = require('supertest');
const app     = require('../../App');

const ESTUDIO_ID_VALIDO = '000000000000000000000001';

describe('NOM011 — Estudios', () => {

  // ── GET /api/nom011/estudios ───────────────────────────────────────────

  describe('GET /api/nom011/estudios', () => {
    it('debe retornar lista de estudios', async () => {
      const res = await request(app).get('/api/nom011/estudios');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.datos)).toBe(true);
    });

    it('debe filtrar por estado', async () => {
      const res = await request(app).get('/api/nom011/estudios?estado=calculado');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.datos)).toBe(true);
    });

    it('debe paginar correctamente', async () => {
      const res = await request(app).get('/api/nom011/estudios?limit=5&skip=0');
      expect(res.status).toBe(200);
      expect(res.body.limit).toBe(5);
    });
  });

  // ── POST /api/nom011/estudios ──────────────────────────────────────────

  describe('POST /api/nom011/estudios', () => {
    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/api/nom011/estudios')
        .send({ numero_informe: 'TEST-001' });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toBeDefined();
    });

    it('debe retornar 400 si falta orden_servicio', async () => {
      const res = await request(app)
        .post('/api/nom011/estudios')
        .send({
          numero_informe: 'TEST-001',
          empresa:        { razon_social: 'Empresa Test' },
        });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toContain('orden_servicio');
    });

    it('debe retornar 400 si falta empresa.razon_social', async () => {
      const res = await request(app)
        .post('/api/nom011/estudios')
        .send({
          numero_informe: 'TEST-001',
          orden_servicio: 'OS-001',
          empresa:        {},
        });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toContain('empresa.razon_social');
    });
  });

  // ── GET /api/nom011/estudios/:id ───────────────────────────────────────

  describe('GET /api/nom011/estudios/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).get('/api/nom011/estudios/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).get(`/api/nom011/estudios/${ESTUDIO_ID_VALIDO}`);
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/nom011/estudios/:id/puntos-fijos ─────────────────────────

  describe('POST /api/nom011/estudios/:id/puntos-fijos', () => {
    it('debe retornar 400 si puntos_fijos está vacío', async () => {
      const res = await request(app)
        .post(`/api/nom011/estudios/${ESTUDIO_ID_VALIDO}/puntos-fijos`)
        .send({ puntos_fijos: [] });
      expect(res.status).toBe(400);
    });

    it('debe retornar 400 si falta area en un punto', async () => {
      const res = await request(app)
        .post(`/api/nom011/estudios/${ESTUDIO_ID_VALIDO}/puntos-fijos`)
        .send({
          puntos_fijos: [{
            numero:              1,
            tiempo_exposicion_h: 7,
            jornada_laboral_h:   11,
            lecturas:            [{ numero: 1, nscea_t: 65.1 }],
          }],
        });
      expect(res.status).toBe(400);
    });

    it('debe retornar 400 si falta tiempo_exposicion_h', async () => {
      const res = await request(app)
        .post(`/api/nom011/estudios/${ESTUDIO_ID_VALIDO}/puntos-fijos`)
        .send({
          puntos_fijos: [{
            numero:            1,
            area:              'Entrada principal',
            jornada_laboral_h: 11,
            lecturas:          [{ numero: 1, nscea_t: 65.1 }],
          }],
        });
      expect(res.status).toBe(400);
    });

    it('debe retornar 400 si una lectura no tiene nscea_t', async () => {
      const res = await request(app)
        .post(`/api/nom011/estudios/${ESTUDIO_ID_VALIDO}/puntos-fijos`)
        .send({
          puntos_fijos: [{
            numero:              1,
            area:                'Entrada principal',
            tiempo_exposicion_h: 7,
            jornada_laboral_h:   11,
            lecturas:            [{ numero: 1 }],
          }],
        });
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 si el estudio no existe', async () => {
      const res = await request(app)
        .post(`/api/nom011/estudios/${ESTUDIO_ID_VALIDO}/puntos-fijos`)
        .send({
          puntos_fijos: [{
            numero:              1,
            area:                'Entrada principal',
            tiempo_exposicion_h: 7,
            jornada_laboral_h:   11,
            lecturas:            [{ numero: 1, nscea_t: 65.1 }],
          }],
        });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/nom011/estudios/:id/dosimetrias ──────────────────────────

  describe('POST /api/nom011/estudios/:id/dosimetrias', () => {
    it('debe retornar 400 si dosimetrias está vacío', async () => {
      const res = await request(app)
        .post(`/api/nom011/estudios/${ESTUDIO_ID_VALIDO}/dosimetrias`)
        .send({ dosimetrias: [] });
      expect(res.status).toBe(400);
    });

    it('debe retornar 400 si falta nombre_trabajador', async () => {
      const res = await request(app)
        .post(`/api/nom011/estudios/${ESTUDIO_ID_VALIDO}/dosimetrias`)
        .send({
          dosimetrias: [{
            numero:                   1,
            area:                     'Producción',
            porcentaje_dosis_final:   44.8,
            tiempo_medicion_h:        7.02,
            jornada_laboral_h:        11,
          }],
        });
      expect(res.status).toBe(400);
    });

    it('debe retornar 400 si falta porcentaje_dosis_final', async () => {
      const res = await request(app)
        .post(`/api/nom011/estudios/${ESTUDIO_ID_VALIDO}/dosimetrias`)
        .send({
          dosimetrias: [{
            numero:            1,
            area:              'Producción',
            nombre_trabajador: 'Juan Pérez',
            tiempo_medicion_h: 7.02,
            jornada_laboral_h: 11,
          }],
        });
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 si el estudio no existe', async () => {
      const res = await request(app)
        .post(`/api/nom011/estudios/${ESTUDIO_ID_VALIDO}/dosimetrias`)
        .send({
          dosimetrias: [{
            numero:                 1,
            area:                   'Producción',
            nombre_trabajador:      'Juan Pérez',
            porcentaje_dosis_final: 44.8,
            tiempo_medicion_h:      7.02,
            jornada_laboral_h:      11,
          }],
        });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/nom011/estudios/:id/calcular ─────────────────────────────

  describe('POST /api/nom011/estudios/:id/calcular', () => {
    it('debe retornar 404 si el estudio no existe', async () => {
      const res = await request(app)
        .post(`/api/nom011/estudios/${ESTUDIO_ID_VALIDO}/calcular`);
      expect(res.status).toBe(404);
    });

    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app)
        .post('/api/nom011/estudios/id-invalido/calcular');
      expect(res.status).toBe(400);
    });
  });

});