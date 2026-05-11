'use strict';

const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const logger    = require('./src/config/logger');
const { inicializar }          = require('./src/config/database');
const { isConnected, getPoolStats } = require('./src/connections/pool');
const { errorHandler, notFound }    = require('./src/middleware/errorHandler');

const app = express();

// ============================================================================
// SEGURIDAD
// ============================================================================

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limit global — 100 req/IP cada 15 min
const limiterGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    ok:      false,
    error:   'Demasiadas solicitudes',
    detalle: 'Has excedido el límite de solicitudes. Intenta en 15 minutos.',
  },
});

// Rate limit estricto para escritura — 30 req/IP cada 15 min
const limiterEscritura = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    ok:      false,
    error:   'Demasiadas solicitudes de escritura',
    detalle: 'Has excedido el límite de creación de registros. Intenta en 15 minutos.',
  },
});

// Rate limit para auth — 10 req/IP cada 15 min (protección contra fuerza bruta)
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    ok:      false,
    error:   'Demasiados intentos de autenticación',
    detalle: 'Has excedido el límite de intentos. Intenta en 15 minutos.',
  },
});

app.use('/api',                  limiterGlobal);
app.use('/api/auth',             limiterAuth);
app.use('/api/nom025/estudios',  limiterEscritura);
app.use('/api/nom081/estudios',  limiterEscritura);
app.use('/api/nom022/estudios',  limiterEscritura);
app.use('/api/nom011/estudios',  limiterEscritura);
app.use('/api/muestreos',        limiterEscritura);

// ============================================================================
// MIDDLEWARE — Verifica conexión de una BD del pool
// ============================================================================

function verificarPool(dbName) {
  return (req, res, next) => {
    if (!isConnected(dbName)) {
      logger.warn(`[Pool] BD ${dbName} no disponible — ${req.method} ${req.path}`);
      return res.status(503).json({
        ok:      false,
        error:   `Base de datos ${dbName} no disponible temporalmente`,
        detalle: 'El servidor está reconectando. Intenta en unos segundos.',
      });
    }
    next();
  };
}

// ============================================================================
// HEALTHCHECK
// ============================================================================

app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const estados  = { 0: 'desconectado', 1: 'conectado', 2: 'conectando', 3: 'desconectando' };

  const poolStats    = getPoolStats();
  const db_app = mongoose.connection.readyState;
  const todasOk      = db_app === 1 && Object.values(poolStats).every(p => p.readyState === 1);

  res.status(todasOk ? 200 : 503).json({
    ok:         todasOk,
    env:        process.env.NODE_ENV ?? 'development',
    uptime:     `${Math.floor(process.uptime())}s`,
    db_app: {
      estado: estados[db_app] ?? 'desconocido',
      ok:     db_app === 1,
    },
    pool: Object.fromEntries(
      Object.entries(poolStats).map(([db, info]) => [
        db,
        { estado: info.readyStateText, ok: info.readyState === 1 }
      ])
    ),
  });
});

// ============================================================================
// RUTAS
// ============================================================================

// Auth — sin verificarPool porque usa mongoose.connection principal 
app.use('/api/auth',      require('./src/routes/auth.routes'));

// NOMs — cada una verifica su propia BD del pool
app.use('/api/muestreos', verificarPool('epa18'),  require('./src/modules/epa-18/muestreo.routes'));
app.use('/api/nom025',    verificarPool('nom025'), require('./src/modules/nom025/routes'));
app.use('/api/nom081',    verificarPool('nom081'), require('./src/modules/nom081/routes'));
app.use('/api/nom022',    verificarPool('nom022'), require('./src/modules/nom022/routes'));
app.use('/api/nom011',    verificarPool('nom011'), require('./src/modules/nom011/routes'));

// ============================================================================
// 404 Y ERROR HANDLER — siempre al final
// ============================================================================

app.use(notFound);
app.use(errorHandler);

// ============================================================================
// INICIALIZAR BD
// ============================================================================

inicializar().catch(err => {
  logger.error(`[APP] Error al inicializar: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

module.exports = app;