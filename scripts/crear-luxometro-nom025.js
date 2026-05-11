// scripts/crear-luxometro-nom025.js
// Ejecutar: node scripts/crear-luxometro-nom025.js
'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const { Luxometro } = require('../src/modules/nom025/model');

// Conexión al pool nom025 (igual que en pool.js)
const MONGO_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017').replace(/\/$/, '') + '/nom025';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function crearLuxometro() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(` Conectado a ${MONGO_URI}\n`);
    console.log('=== CREAR LUXÓMETRO NOM-025 ===\n');

    const marca            = await ask('Marca: ');
    const modelo           = await ask('Modelo: ');
    const serie_id         = await ask('Número de serie: ');
    const fecha_calibracion = await ask('Fecha de calibración (YYYY-MM-DD): ');
    const fecha_vencimiento = await ask('Fecha de vencimiento (YYYY-MM-DD): ');
    const certificado      = await ask('Número de certificado (ej: SIMH-OPTICA/0008-2025): ');
    const u_rel_str        = await ask('Incertidumbre relativa % del certificado (ej: 3.66): ');
    const u_relativa       = parseFloat(u_rel_str) / 100;

    console.log('\n Ingresa los puntos de calibración del certificado.');
    console.log('   Formato: iluminancia_ref y factor de corrección.');
    console.log('   Deja iluminancia vacía para terminar.\n');

    const factores_correccion = [];
    let i = 1;
    while (true) {
      const ilum_str = await ask(`Punto ${i} — Iluminancia de referencia (lux): `);
      if (!ilum_str.trim()) break;
      const factor_str = await ask(`Punto ${i} — Factor de corrección: `);
      factores_correccion.push({
        iluminancia_ref: parseFloat(ilum_str),
        factor:          parseFloat(factor_str)
      });
      i++;
    }

    if (factores_correccion.length === 0) {
      console.log('\n  No ingresaste factores. Abortando.');
      rl.close(); process.exit(1);
    }

    const lux = new Luxometro({
      marca, modelo, serie_id,
      fecha_calibracion: new Date(fecha_calibracion),
      fecha_vencimiento: new Date(fecha_vencimiento),
      certificado, u_relativa, factores_correccion, activo: true
    });

    await lux.save();

    console.log('\n creado exitosamente:');
    console.log(`   _id:         ${lux._id}`);
    console.log(`   Marca:       ${lux.marca} ${lux.modelo}`);
    console.log(`   Serie:       ${lux.serie_id}`);
    console.log(`   Certificado: ${lux.certificado}`);
    console.log(`   u_relativa:  ${(lux.u_relativa * 100).toFixed(2)}%`);
    console.log(`   Puntos de calibración: ${lux.factores_correccion.length}`);
    lux.factores_correccion.forEach((f, idx) => {
      console.log(`     ${idx+1}. ${f.iluminancia_ref} lux → factor ${f.factor}`);
    });

    rl.close(); process.exit(0);
  } catch (err) {
    console.error('\ Error:', err.message);
    rl.close(); process.exit(1);
  }
}

crearLuxometro();