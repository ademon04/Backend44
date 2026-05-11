'use strict';

const mongoose        = require('mongoose');
const { isConnected } = require('../src/connections/pool');

beforeAll(async () => {
  process.env.NODE_ENV    = 'test';
  process.env.MONGODB_URI = 'mongodb://localhost:27017';

  await new Promise((resolve) => {
    const interval = setInterval(() => {
      if (
        isConnected('app') &&
        isConnected('nom025') &&
        isConnected('nom081') &&
        isConnected('nom022') &&
        isConnected('nom011')
      ) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
});

afterAll(async () => {
  await mongoose.disconnect();
});