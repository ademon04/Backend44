// scripts/crear-dosimetro-nom011.js
// Ejecutar: node scripts/crear-dosimetro-nom011.js

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const { Dosimetro011 } = require('../src/modules/nom011/model');

const MONGO_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017').replace(/\/$/, '') + '/nom011';

const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function crearDosimetro() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Conectado a ${MONGO_URI}\n`);
    console.log('=== CREAR DOSÍMETRO NOM-011 ===\n');

    const marca             = await ask('Marca: ');
    const modelo            = await ask('Modelo: ');
    const serie_id          = await ask('Número de serie: ');
    const fecha_calibracion = await ask('Fecha de calibración (YYYY-MM-DD): ');
    const fecha_vencimiento = await ask('Fecha de vencimiento (YYYY-MM-DD): ');
    const certificado       = await ask('Número de certificado (opcional): ');
    const observaciones     = await ask('Observaciones (opcional): ');

    const existe = await Dosimetro011.findOne({ serie_id });
    if (existe) {
      console.log(`\n  Ya existe un dosímetro con serie: ${serie_id}`);
      rl.close();
      process.exit(0);
    }

    const dosimetro = new Dosimetro011({
      marca,
      modelo,
      serie_id,
      fecha_calibracion: new Date(fecha_calibracion),
      fecha_vencimiento: new Date(fecha_vencimiento),
      certificado:       certificado   || undefined,
      observaciones:     observaciones || undefined,
      activo:            true,
    });

    await dosimetro.save();

    console.log('\n Dosímetro creado exitosamente:');
    console.log(`   _id:          ${dosimetro._id}`);
    console.log(`   Marca/Modelo: ${dosimetro.marca} ${dosimetro.modelo}`);
    console.log(`   Serie:        ${dosimetro.serie_id}`);
    console.log(`   Certificado:  ${dosimetro.certificado || 'N/A'}`);
    console.log(`   Vigencia:     ${dosimetro.fecha_calibracion.toLocaleDateString()} → ${dosimetro.fecha_vencimiento.toLocaleDateString()}`);

    rl.close();
    process.exit(0);

  } catch (err) {
    console.error('\n Error:', err.message);
    rl.close();
    process.exit(1);
  }
}

crearDosimetro();