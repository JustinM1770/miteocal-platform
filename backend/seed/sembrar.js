#!/usr/bin/env node
/**
 * Siembra el municipio de Teocaltiche.
 *
 * Contra el emulador (lo normal, no pide credenciales):
 *   npm run emu           # en otra terminal
 *   npm run sembrar
 *
 * Contra un proyecto real (con cuidado):
 *   FIRESTORE_EMULATOR_HOST= node seed/sembrar.js --produccion
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const MUNICIPIO_ID = 'teocaltiche';
const aProduccion = process.argv.includes('--produccion');

if (!aProduccion && !process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'miteocal',
});

const db = admin.firestore();
const leer = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));

async function main() {
  const destino = process.env.FIRESTORE_EMULATOR_HOST
    ? `emulador (${process.env.FIRESTORE_EMULATOR_HOST})`
    : 'PRODUCCION';
  console.log(`Sembrando "${MUNICIPIO_ID}" en ${destino}...`);

  const municipio = leer('teocaltiche.json');
  const config = leer('config.json');
  const raiz = db.collection('municipios').doc(MUNICIPIO_ID);

  await raiz.set(municipio, { merge: true });
  await raiz.collection('config').doc('colonias').set(config.colonias);
  await raiz.collection('config').doc('emergencias').set(config.emergencias);

  // Estado del agua de hoy, para que la app tenga algo que pintar desde el dia 1.
  const hoy = new Date().toISOString().slice(0, 10);
  await raiz.collection('agua').doc(hoy).set({
    horario: '06:00 - 12:00',
    presion: 2.4,
    calidad: 'Potable',
    cobertura: 'Total',
    estado: 'activo',
    incidencias: [],
    actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`  municipios/${MUNICIPIO_ID}`);
  console.log(`  municipios/${MUNICIPIO_ID}/config/{colonias,emergencias}`);
  console.log(`  municipios/${MUNICIPIO_ID}/agua/${hoy}`);
  console.log('\nListo. Revisa el emulador en http://localhost:4000');
  console.log('Recuerda: colonias y telefonos de emergencia son PLACEHOLDER.');
}

main().catch((e) => {
  console.error('Fallo la siembra:', e.message);
  process.exit(1);
});
