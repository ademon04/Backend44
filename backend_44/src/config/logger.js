'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// ============================================================================
// FORMATO
// ============================================================================

const formato = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `[${timestamp}] [${level.toUpperCase()}] ${message}\n${stack}`
      : `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  })
);

// ============================================================================
// TRANSPORTS
// ============================================================================

const transports = [
  // Consola — siempre activa
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      formato
    ),
  }),

  // Archivo con rotación diaria
  new DailyRotateFile({
    dirname:        path.join(process.cwd(), 'logs'),
    filename:       'app-%DATE%.log',
    datePattern:    'YYYY-MM-DD',
    maxSize:        '10m',
    maxFiles:       '14d',
    level:          'info',
    format:         formato,
  }),

  // Archivo solo de errores
  new DailyRotateFile({
    dirname:        path.join(process.cwd(), 'logs'),
    filename:       'error-%DATE%.log',
    datePattern:    'YYYY-MM-DD',
    maxSize:        '10m',
    maxFiles:       '30d',
    level:          'error',
    format:         formato,
  }),
];

// ============================================================================
// LOGGER
// ============================================================================

const logger = winston.createLogger({
  level:      process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  transports,
});

module.exports = logger;