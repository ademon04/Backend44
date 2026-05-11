// scripts/crear-multimetro-nom022.js
// Ejecutar: node scripts/crear-multimetro-nom022.js

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const { Multimetro } = require('../src/modules/nom022/model');

const MONGO_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017').replace(/\/$/, '') + '/nom022';

const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function crearMultimetro() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Conectado a ${MONGO_URI}\n`);
    console.log('=== CREAR MULTÍMETRO NOM-022 ===\n');

    const marca             = await ask('Marca: ');
    const modelo            = await ask('Modelo: ');
    const serie_id          = await ask('Número de serie: ');
    const fecha_calibracion = await ask('Fecha de calibración (YYYY-MM-DD): ');
    const fecha_vencimiento = await ask('Fecha de vencimiento (YYYY-MM-DD): ');
    const certificado       = await ask('Número de certificado: ');
    const observaciones     = await ask('Observaciones (opcional): ');

    const multimetro = new Multimetro({
      marca,
      modelo,
      serie_id,
      fecha_calibracion: new Date(fecha_calibracion),
      fecha_vencimiento: new Date(fecha_vencimiento),
      certificado,
      activo:       true,
      observaciones: observaciones || undefined,
    });

    await multimetro.save();

    console.log('\n✅ Multímetro creado exitosamente:');
    console.log(`   _id:          ${multimetro._id}`);
    console.log(`   Marca/Modelo: ${multimetro.marca} ${multimetro.modelo}`);
    console.log(`   Serie:        ${multimetro.serie_id}`);
    console.log(`   Certificado:  ${multimetro.certificado}`);
    console.log(`   Vigencia:     ${multimetro.fecha_calibracion.toLocaleDateString()} → ${multimetro.fecha_vencimiento.toLocaleDateString()}`);

    rl.close();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    rl.close();
    process.exit(1);
  }
}

crearMultimetro();