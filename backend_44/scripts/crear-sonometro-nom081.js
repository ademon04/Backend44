// scripts/crear-sonometro-nom081.js
// Ejecutar: node scripts/crear-sonometro-nom081.js

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const { SonometroNOM081 } = require('../src/modules/nom081/model');

const MONGO_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017').replace(/\/$/, '') + '/nom081';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function crearSonometro() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Conectado a ${MONGO_URI}\n`);
    console.log('=== CREAR SONÓMETRO NOM-081 ===\n');

    const marca = await ask('Marca: ');
    const modelo = await ask('Modelo: ');
    const serie_id = await ask('Número de serie: ');
    const clase = await ask('Clase (Clase 1 / Clase 2 / Tipo 1 / Tipo 2): ');
    const fecha_calibracion = await ask('Fecha de calibración (YYYY-MM-DD): ');
    const fecha_vencimiento = await ask('Fecha de vencimiento (YYYY-MM-DD): ');
    const certificado = await ask('Número de certificado: ');
    
    const incertidumbre_valor = await ask('Incertidumbre global (ej: 0.3 para 0.3 dB o 0.3 para 0.3%): ');
    const tipo_incertidumbre = await ask('Tipo de incertidumbre (db / porcentaje): ');
    let incertidumbre_global = parseFloat(incertidumbre_valor);
    if (tipo_incertidumbre.toLowerCase() === 'porcentaje') {
      incertidumbre_global = incertidumbre_global / 100;
    }
    
    const tieneCalibrador = await ask('\n¿Asociar calibrador acústico? (s/n): ');
    let calibrador_asociado = {};
    if (tieneCalibrador.toLowerCase() === 's') {
      console.log('\n--- Datos del calibrador acústico ---');
      calibrador_asociado = {
        marca: await ask('  Marca del calibrador: '),
        modelo: await ask('  Modelo del calibrador: '),
        serie: await ask('  Serie del calibrador: '),
        certificado: await ask('  Certificado del calibrador: ')
      };
      
      const tieneFechaCal = await ask('  ¿Registrar fechas de calibración del calibrador? (s/n): ');
      if (tieneFechaCal.toLowerCase() === 's') {
        calibrador_asociado.fecha_calibracion = new Date(await ask('  Fecha de calibración (YYYY-MM-DD): '));
        calibrador_asociado.fecha_vencimiento = new Date(await ask('  Fecha de vencimiento (YYYY-MM-DD): '));
      }
    }
    
    console.log('\n Ingresa los puntos de calibración por frecuencia.');
    console.log('   Formato: frecuencia (Hz) y corrección (dB).');
    console.log('   Frecuencias típicas: 125, 250, 500, 1000, 2000, 4000, 8000');
    console.log('   Deja frecuencia vacía para terminar.\n');
    
    const calibracion_frecuencias = [];
    let i = 1;
    while (true) {
      const freq_str = await ask(`Punto ${i} — Frecuencia (Hz): `);
      if (!freq_str.trim()) break;
      
      const correccion_str = await ask(`Punto ${i} — Corrección (dB): `);
      const incertidumbre_str = await ask(`Punto ${i} — Incertidumbre en esa frecuencia (dB) [opcional]: `);
      
      const punto = {
        frecuencia_hz: parseFloat(freq_str),
        correccion_db: parseFloat(correccion_str)
      };
      
      if (incertidumbre_str.trim()) {
        punto.incertidumbre_db = parseFloat(incertidumbre_str);
      }
      
      calibracion_frecuencias.push(punto);
      i++;
    }
    
    if (calibracion_frecuencias.length === 0) {
      console.log('\n  No ingresaste puntos de calibración.');
      const continuar = await ask('¿Deseas continuar sin ellos? (s/n): ');
      if (continuar.toLowerCase() !== 's') {
        console.log(' Operación cancelada');
        rl.close();
        process.exit(1);
      }
    }
    
    const observaciones = await ask('\nObservaciones (opcional): ');
    
    const sonometro = new SonometroNOM081({
      marca,
      modelo,
      serie_id,
      clase,
      fecha_calibracion: new Date(fecha_calibracion),
      fecha_vencimiento: new Date(fecha_vencimiento),
      certificado,
      incertidumbre_global,
      tipo_incertidumbre: tipo_incertidumbre.toLowerCase(),
      calibracion_frecuencias,
      calibrador_asociado: Object.keys(calibrador_asociado).length > 0 ? calibrador_asociado : undefined,
      activo: true,
      observaciones: observaciones || undefined
    });
    
    await sonometro.save();
    
    console.log('\n Sonómetro creado exitosamente:');
    console.log(`   _id:           ${sonometro._id}`);
    console.log(`   Marca/Modelo:  ${sonometro.marca} ${sonometro.modelo}`);
    console.log(`   Serie:         ${sonometro.serie_id}`);
    console.log(`   Clase:         ${sonometro.clase}`);
    console.log(`   Certificado:   ${sonometro.certificado}`);
    console.log(`   Incertidumbre: ${sonometro.incertidumbre_global} ${sonometro.tipo_incertidumbre === 'porcentaje' ? '%' : 'dB'}`);
    console.log(`   Vigencia:      ${sonometro.fecha_calibracion.toLocaleDateString()} → ${sonometro.fecha_vencimiento.toLocaleDateString()}`);
    console.log(`   Puntos de calibración: ${sonometro.calibracion_frecuencias.length}`);
    
    if (sonometro.calibracion_frecuencias.length > 0) {
      console.log('\n   Frecuencias y correcciones:');
      sonometro.calibracion_frecuencias.forEach((p, idx) => {
        console.log(`     ${idx+1}. ${p.frecuencia_hz} Hz → ${p.correccion_db} dB${p.incertidumbre_db ? ` (±${p.incertidumbre_db} dB)` : ''}`);
      });
    }
    
    if (sonometro.calibrador_asociado && Object.keys(sonometro.calibrador_asociado).length > 0) {
      console.log('\n   Calibrador asociado:');
      console.log(`     ${sonometro.calibrador_asociado.marca} ${sonometro.calibrador_asociado.modelo} (Serie: ${sonometro.calibrador_asociado.serie})`);
      if (sonometro.calibrador_asociado.fecha_calibracion) {
        console.log(`     Vigencia calibrador: ${sonometro.calibrador_asociado.fecha_calibracion.toLocaleDateString()} → ${sonometro.calibrador_asociado.fecha_vencimiento?.toLocaleDateString() || 'N/A'}`);
      }
    }
    
    rl.close();
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    rl.close();
    process.exit(1);
  }
}

crearSonometro();