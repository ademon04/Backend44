'use strict';

const app = require('../App');
const logger = require('../src/config/logger');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`[APP] ✅ Servidor corriendo en puerto ${PORT}`);
});