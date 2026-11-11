#!/usr/bin/env node
/**
 * Carga los datos REALES de Teocaltiche: colonias, programa de la Feria 2026
 * y candidatas. Salen de seed/teocaltiche-reales.json (exportado de los datos
 * que dio el municipio). Usa los mismos campos que escribe el panel y lee la
 * app, así lo cargado aquí se puede editar después desde el panel.
 *
 * Contra el emulador:   node seed/sembrar-reales.js
 * Contra producción:    GOOGLE_APPLICATION_CREDENTIALS=~/llaves/miteocal-admin.json \
 *                       node seed/sembrar-reales.js --produccion
 *
 * Es idempotente: usa ids fijos, correrlo dos veces no duplica nada.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const MUNICIPIO_ID = 'teocaltiche';
const aProduccion = process.argv.includes('--produccion');
if (!aProduccion && !process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}
admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'miteocal' });
const db = admin.firestore();
const leer = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));

async function main() {
  const reales = leer('teocaltiche-reales.json');
  const municipio = leer('teocaltiche.json');
  const config = leer('config.json');
  const raiz = db.collection('municipios').doc(MUNICIPIO_ID);
  const ahora = admin.firestore.FieldValue.serverTimestamp();
  console.log(`Cargando datos reales en ${aProduccion ? 'PRODUCCIÓN' : 'el emulador'}...`);

  // Municipio activo, con la feria encendida
  delete municipio.escudo; // el escudo aún no está en Storage
  for (const [k, v] of Object.entries(municipio.contacto || {})) {
    if (typeof v === 'string' && v.toUpperCase().startsWith('TODO')) delete municipio.contacto[k];
  }
  await raiz.set({ ...municipio, activo: true, modulos: { ...municipio.modulos, feria: true } }, { merge: true });

  await raiz.collection('config').doc('colonias').set({ lista: reales.colonias });
  const emergencias = config.emergencias.lista.filter(
    (x) => !Object.values(x).some((v) => typeof v === 'string' && v.toUpperCase().startsWith('TODO')));
  await raiz.collection('config').doc('emergencias').set({ lista: emergencias });
  await raiz.collection('config').doc('feria').set(
    { nombre: 'Feria de Noviembre 2026', inicio: '2026-10-30', fin: '2026-11-12' }, { merge: true });
  if (config.catalogos) await raiz.collection('config').doc('catalogos').set(config.catalogos, { merge: true });

  const lote = db.batch();
  for (const { id, ...e } of reales.eventos) {
    lote.set(raiz.collection('eventos').doc(id), { ...e, creadoEn: ahora }, { merge: true });
  }
  for (const { id, ...c } of reales.candidatas) {
    lote.set(raiz.collection('candidatas').doc(id), c, { merge: true });
  }
  for (const certamen of ['reina', 'miss_chiquitita']) {
    lote.set(raiz.collection('certamenes').doc(certamen), {
      certamen, votacionAbierta: true, cierraEn: '2026-11-12T23:59', ganadoraId: null,
    }, { merge: true });
  }
  await lote.commit();

  console.log(`  ${reales.colonias.length} colonias · ${reales.eventos.length} eventos · ${reales.candidatas.length} candidatas`);
  console.log(`  ${emergencias.length} teléfonos de emergencia`);
  console.log('Listo.');
}

main().catch((e) => { console.error('Falló la carga:', e.message); process.exit(1); });
