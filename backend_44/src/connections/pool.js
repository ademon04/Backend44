'use strict';

const mongoose = require('mongoose');
const logger   = require('../config/logger');

const connections = new Map();

const POOL_CONFIG = {
  maxPoolSize:      10,
  minPoolSize:      2,
  connectTimeoutMS: 10000,
  socketTimeoutMS:  45000,
};

function getConnection(databaseName) {
  if (connections.has(databaseName)) {
    const conn = connections.get(databaseName);
    if (conn.readyState === 1 || conn.readyState === 2) {
      return conn;
    }
    connections.delete(databaseName);
  }

  const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const url     = `${baseUri.replace(/\/$/, '')}/${databaseName}`;

  logger.info(`[Pool] Conectando a base de datos: ${databaseName}`);

  const conn = mongoose.createConnection(url, POOL_CONFIG);

  conn.on('connected',    () => logger.info(`[Pool] ${databaseName} conectado`));
  conn.on('disconnected', () => logger.warn(`[Pool]  ${databaseName} desconectado`));
  conn.on('error',        (err) => logger.error(`[Pool]  ${databaseName} error: ${err.message}`));

  connections.set(databaseName, conn);
  return conn;
}

function isConnected(databaseName) {
  const conn = connections.get(databaseName);
  return conn?.readyState === 1;
}

function getPoolStats() {
  const stats = {};
  for (const [db, conn] of connections) {
    stats[db] = {
      readyState:     conn.readyState,
      readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][conn.readyState],
    };
  }
  return stats;
}

module.exports = { getConnection, isConnected, getPoolStats };