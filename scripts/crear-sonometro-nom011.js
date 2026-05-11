// scripts/crear-sonometro-nom011.js
// Ejecutar: node scripts/crear-sonometro-nom011.js

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const { SonometroIntegrador011 } = require('../src/modules/nom011/model');

const MONGO_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017').replace(/\/$/, '') + '/nom011';

const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function crearSonometro() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Conectado a ${MONGO_URI}\n`);
    console.log('=== CREAR SONÓMETRO INTEGRADOR NOM-011 ===\n');

    const marca             = await ask('Marca: ');
    const modelo            = await ask('Modelo: ');
    const serie_id          = await ask('Número de serie: ');
    const fecha_calibracion = await ask('Fecha de calibración (YYYY-MM-DD): ');
    const fecha_vencimiento = await ask('Fecha de vencimiento (YYYY-MM-DD): ');
    const certificado       = await ask('Número de certificado: ');

    const incertidumbre_db_str  = await ask('Incertidumbre en dB(A) (opcional, Enter para omitir): ');
    const incertidumbre_pct_str = await ask('Incertidumbre en % (opcional, Enter para omitir): ');
    const factor_str            = await ask('Factor de cobertura (default 2): ');
    const observaciones         = await ask('Observaciones (opcional): ');

    const existe = await SonometroIntegrador011.findOne({ serie_id });
    if (existe) {
      console.log(`\n  Ya existe un sonómetro con serie: ${serie_id}`);
      rl.close();
      process.exit(0);
    }

    const sonometro = new SonometroIntegrador011({
      marca,
      modelo,
      serie_id,
      fecha_calibracion: new Date(fecha_calibracion),
      fecha_vencimiento: new Date(fecha_vencimiento),
      certificado:       certificado || undefined,
      incertidumbre_db:  incertidumbre_db_str  ? parseFloat(incertidumbre_db_str)  : undefined,
      incertidumbre_pct: incertidumbre_pct_str ? parseFloat(incertidumbre_pct_str) : undefined,
      factor_cobertura:  factor_str ? parseInt(factor_str) : 2,
      observaciones:     observaciones || undefined,
      activo:            true,
    });

    await sonometro.save();

    console.log('\n Sonómetro integrador creado exitosamente:');
    console.log(`   _id:          ${sonometro._id}`);
    console.log(`   Marca/Modelo: ${sonometro.marca} ${sonometro.modelo}`);
    console.log(`   Serie:        ${sonometro.serie_id}`);
    console.log(`   Certificado:  ${sonometro.certificado || 'N/A'}`);
    console.log(`   Vigencia:     ${sonometro.fecha_calibracion.toLocaleDateString()} → ${sonometro.fecha_vencimiento.toLocaleDateString()}`);
    if (sonometro.incertidumbre_db)  console.log(`   Incert. dB:   ${sonometro.incertidumbre_db}`);
    if (sonometro.incertidumbre_pct) console.log(`   Incert. %:    ${sonometro.incertidumbre_pct}`);

    rl.close();
    process.exit(0);

  } catch (err) {
    console.error('\n Error:', err.message);
    rl.close();
    process.exit(1);
  }
}

crearSonometro();