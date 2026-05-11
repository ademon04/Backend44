'use strict';

const request = require('supertest');
const app     = require('../../App');

const ESTUDIO_ID_VALIDO = '000000000000000000000001';

describe('NOM022 — Estudios', () => {

  // ── GET /api/nom022/estudios ───────────────────────────────────────────

  describe('GET /api/nom022/estudios', () => {
    it('debe retornar lista de estudios', async () => {
      const res = await request(app).get('/api/nom022/estudios');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.datos)).toBe(true);
    });

    it('debe filtrar por estado', async () => {
      const res = await request(app).get('/api/nom022/estudios?estado=calculado');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.datos)).toBe(true);
    });

    it('debe paginar correctamente', async () => {
      const res = await request(app).get('/api/nom022/estudios?limit=5&skip=0');
      expect(res.status).toBe(200);
      expect(res.body.limit).toBe(5);
    });
  });

  // ── POST /api/nom022/estudios ──────────────────────────────────────────

  describe('POST /api/nom022/estudios', () => {
    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/api/nom022/estudios')
        .send({ numero_informe: 'TEST-001' });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toBeDefined();
    });

    it('debe retornar 400 si falta empresa.razon_social', async () => {
      const res = await request(app)
        .post('/api/nom022/estudios')
        .send({
          numero_informe: 'TEST-001',
          orden_servicio: 'OS-001',
          empresa:        {},
        });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toContain('empresa.razon_social');
    });

    it('debe retornar 400 si falta orden_servicio', async () => {
      const res = await request(app)
        .post('/api/nom022/estudios')
        .send({
          numero_informe: 'TEST-001',
          empresa:        { razon_social: 'Empresa Test' },
        });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toContain('orden_servicio');
    });
  });

  // ── GET /api/nom022/estudios/:id ───────────────────────────────────────

  describe('GET /api/nom022/estudios/:id', () => {
    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app).get('/api/nom022/estudios/id-invalido');
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 con ID válido pero inexistente', async () => {
      const res = await request(app).get(`/api/nom022/estudios/${ESTUDIO_ID_VALIDO}`);
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/nom022/estudios/:id/pozos ───────────────────────────────

  describe('POST /api/nom022/estudios/:id/pozos', () => {
    it('debe retornar 400 si pozos está vacío', async () => {
      const res = await request(app)
        .post(`/api/nom022/estudios/${ESTUDIO_ID_VALIDO}/pozos`)
        .send({ pozos: [] });
      expect(res.status).toBe(400);
    });

    it('debe retornar 400 si un pozo no tiene sistema válido', async () => {
      const res = await request(app)
        .post(`/api/nom022/estudios/${ESTUDIO_ID_VALIDO}/pozos`)
        .send({
          pozos: [{
            numero:   1,
            sistema:  'Invalido',
            lecturas: [{ distancia_m: 1, valor_ohm: 5.5 }],
          }],
        });
      expect(res.status).toBe(400);
    });

    it('debe retornar 400 si una lectura no tiene valor_ohm', async () => {
      const res = await request(app)
        .post(`/api/nom022/estudios/${ESTUDIO_ID_VALIDO}/pozos`)
        .send({
          pozos: [{
            numero:   1,
            sistema:  'Pararrayos',
            lecturas: [{ distancia_m: 1 }],
          }],
        });
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 si el estudio no existe', async () => {
      const res = await request(app)
        .post(`/api/nom022/estudios/${ESTUDIO_ID_VALIDO}/pozos`)
        .send({
          pozos: [{
            numero:   1,
            sistema:  'Pararrayos',
            lecturas: [{ distancia_m: 1, valor_ohm: 5.5 }],
          }],
        });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/nom022/estudios/:id/continuidades ───────────────────────

  describe('POST /api/nom022/estudios/:id/continuidades', () => {
    it('debe retornar 400 si continuidades está vacío', async () => {
      const res = await request(app)
        .post(`/api/nom022/estudios/${ESTUDIO_ID_VALIDO}/continuidades`)
        .send({ continuidades: [] });
      expect(res.status).toBe(400);
    });

    it('debe retornar 400 si falta identificacion', async () => {
      const res = await request(app)
        .post(`/api/nom022/estudios/${ESTUDIO_ID_VALIDO}/continuidades`)
        .send({ continuidades: [{ continuidad_ohm: 1.5 }] });
      expect(res.status).toBe(400);
    });

    it('debe retornar 404 si el estudio no existe', async () => {
      const res = await request(app)
        .post(`/api/nom022/estudios/${ESTUDIO_ID_VALIDO}/continuidades`)
        .send({
          continuidades: [{
            identificacion: 'TEST-001',
            continuidad_ohm: 1.5,
          }],
        });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/nom022/estudios/:id/verificacion ────────────────────────

  describe('POST /api/nom022/estudios/:id/verificacion', () => {
    it('debe retornar 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post(`/api/nom022/estudios/${ESTUDIO_ID_VALIDO}/verificacion`)
        .send({ resistencia_1ohm_inicial: 1.02 });
      expect(res.status).toBe(400);
      expect(res.body.faltantes).toBeDefined();
    });

    it('debe retornar 404 si el estudio no existe', async () => {
      const res = await request(app)
        .post(`/api/nom022/estudios/${ESTUDIO_ID_VALIDO}/verificacion`)
        .send({
          resistencia_1ohm_inicial:  1.02,
          resistencia_10ohm_inicial: 10.2,
          resistencia_22ohm_inicial: 22.3,
          resistencia_30ohm_inicial: 30.5,
          resistencia_1ohm_final:    1.04,
          resistencia_10ohm_final:   10.4,
          resistencia_22ohm_final:   22.9,
          resistencia_30ohm_final:   31.5,
          verificado_por:            'Ingeniero Test',
        });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/nom022/estudios/:id/calcular ────────────────────────────

  describe('POST /api/nom022/estudios/:id/calcular', () => {
    it('debe retornar 404 si el estudio no existe', async () => {
      const res = await request(app)
        .post(`/api/nom022/estudios/${ESTUDIO_ID_VALIDO}/calcular`);
      expect(res.status).toBe(404);
    });

    it('debe retornar 400 con ID inválido', async () => {
      const res = await request(app)
        .post('/api/nom022/estudios/id-invalido/calcular');
      expect(res.status).toBe(400);
    });
  });

});