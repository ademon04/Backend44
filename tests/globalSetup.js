'use strict';

module.exports = async () => {
  process.env.NODE_ENV    = 'test';
  process.env.MONGODB_URI = 'mongodb://localhost:27017';
  process.env.JWT_SECRET  = 'test_secret_ci';
};