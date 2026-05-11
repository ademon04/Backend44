// src/config/database.js
'use strict';

const mongoose = require('mongoose');

//  FIX: leer MONGODB_URI (igual que pool.js y el .env) y agregar /epa18
const MONGO_URI = process.env.MONGODB_URI
  ? `${process.env.MONGODB_URI.replace(/\/$/, '')}/appv`
  : 'mongodb://localhost:27017/app';

const OPCIONES = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          45000,
  family:                   4,
};

let reconectando = false;
let intentos     = 0;
const MAX_INTENTOS = 10;
const DELAY_BASE_MS = 2000;

function calcularDelay(intento) {
  const exp    = Math.min(DELAY_BASE_MS * Math.pow(2, intento), 30000);
  const jitter = Math.random() * 1000;
  return exp + jitter;
}

async function conectar() {
  if (reconectando) return;
  reconectando = true;
  intentos++;

  try {
    await mongoose.connect(MONGO_URI, OPCIONES);
    reconectando = false;
    intentos     = 0;
    console.log(`[DB]  MongoDB conectado → ${MONGO_URI}`);
  } catch (err) {
    reconectando = false;

    if (intentos >= MAX_INTENTOS) {
      console.error(`[DB]  No se pudo conectar después de ${MAX_INTENTOS} intentos. Cerrando proceso.`);
      process.exit(1);
    }

    const delay = calcularDelay(intentos);
    console.warn(`[DB]   Intento ${intentos}/${MAX_INTENTOS} fallido: ${err.message}`);
    console.warn(`[DB]    Reintentando en ${(delay / 1000).toFixed(1)}s...`);
    setTimeout(conectar, delay);
  }
}

function registrarEventos() {
  const conn = mongoose.connection;

  conn.on('connected', () => {
    console.log('[DB]  Conexión establecida');
  });

  conn.on('disconnected', () => {
    console.warn('[DB] Conexión perdida — reconectando...');
    setTimeout(conectar, DELAY_BASE_MS);
  });

  conn.on('reconnected', () => {
    console.log('[DB]  Reconectado a MongoDB');
    intentos = 0;
  });

  conn.on('error', (err) => {
    console.error('[DB] Error de conexión:', err.message);
  });

  process.on('SIGINT',  () => cerrar('SIGINT'));
  process.on('SIGTERM', () => cerrar('SIGTERM'));
}

async function cerrar(señal) {
  console.log(`\n[DB]  Señal ${señal} recibida — cerrando conexión MongoDB...`);
  await mongoose.connection.close();
  console.log('[DB] Conexión cerrada. Bye.');
  process.exit(0);
}

async function inicializar() {
  registrarEventos();
  await conectar();
}

function verificarConexion(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error:   'Base de datos no disponible temporalmente',
      detalle: 'El servidor está reconectando a MongoDB. Intenta en unos segundos.'
    });
  }
  next();
}

module.exports = { inicializar, verificarConexion };