'use strict';

const mongoose        = require('mongoose');
const { isConnected, getConnection } = require('../src/connections/pool');

beforeAll(async () => {
  process.env.NODE_ENV    = 'test';
  process.env.MONGODB_URI = 'mongodb://localhost:27017';

  // Forzar inicialización de todas las conexiones
  getConnection('app');
  getConnection('nom025');
  getConnection('nom081');
  getConnection('nom022');
  getConnection('nom011');

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout: MongoDB no conectó en 30s'));
    }, 30000);

    const interval = setInterval(() => {
      if (
        isConnected('app') &&
        isConnected('nom025') &&
        isConnected('nom081') &&
        isConnected('nom022') &&
        isConnected('nom011')
      ) {
        clearInterval(interval);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);
  });
}, 35000);

afterAll(async () => {
  await mongoose.disconnect();
});