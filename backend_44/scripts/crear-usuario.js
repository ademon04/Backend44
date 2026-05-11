// scripts/crear-usuario.js
// Ejecutar: node scripts/crear-usuario.js

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const { Usuario } = require('../src/models/usuario.model');

const MONGO_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017').replace(/\/$/, '') + '/appvidesa';

const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function crearUsuario() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Conectado a ${MONGO_URI}\n`);
    console.log('=== CREAR USUARIO ===\n');

    const nombre = await ask('Nombre completo: ');
    const email  = await ask('Email: ');

    // Verificar si ya existe
    const existe = await Usuario.findOne({ email: email.toLowerCase().trim() });
    if (existe) {
      console.log(`\n  Ya existe un usuario con email: ${email}`);
      rl.close();
      process.exit(0);
    }

    const password = await ask('Password: ');

    console.log('\nRoles disponibles:');
    console.log('  1. admin');
    console.log('  2. laboratorio');
    console.log('  3. supervisor');
    console.log('  4. signatario');
    console.log('  5. consulta');
    const rolOpcion = await ask('\nSelecciona rol (1-5): ');

    const roles = {
      '1': 'admin',
      '2': 'laboratorio',
      '3': 'supervisor',
      '4': 'signatario',
      '5': 'consulta',
    };

    const rol = roles[rolOpcion.trim()];
    if (!rol) {
      console.log('\n Opción inválida');
      rl.close();
      process.exit(1);
    }

    // Datos de firma (opcional, para supervisor y signatario)
    let firma = {};
    if (rol === 'supervisor' || rol === 'signatario') {
      console.log('\n--- Datos de firma (opcional, Enter para omitir) ---');
      const cedula      = await ask('  Cédula profesional: ');
      const cargo       = await ask('  Cargo oficial: ');
      const institucion = await ask('  Institución: ');

      if (cedula || cargo || institucion) {
        firma = {
          cedula:      cedula      || undefined,
          cargo:       cargo       || undefined,
          institucion: institucion || undefined,
        };
      }
    }

    const usuario = new Usuario({
      nombre,
      email,
      password_hash: password,
      rol,
      firma: Object.keys(firma).length > 0 ? firma : undefined,
      activo: true,
    });

    await usuario.save();

    console.log('\n Usuario creado exitosamente:');
    console.log(`   _id:    ${usuario._id}`);
    console.log(`   Nombre: ${usuario.nombre}`);
    console.log(`   Email:  ${usuario.email}`);
    console.log(`   Rol:    ${usuario.rol}`);
    if (firma.cedula) console.log(`   Cédula: ${firma.cedula}`);
    if (firma.cargo)  console.log(`   Cargo:  ${firma.cargo}`);

    rl.close();
    process.exit(0);

  } catch (err) {
    console.error('\n Error:', err.message);
    rl.close();
    process.exit(1);
  }
}

crearUsuario();