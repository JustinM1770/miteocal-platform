#!/usr/bin/env node
/**
 * Crea una cuenta de personal del municipio y le asigna sus custom claims.
 *
 * Existe para romper el huevo y la gallina: el panel exige rol de
 * funcionario, pero el rol lo asigna una Cloud Function que a su vez exige un
 * admin. La PRIMERA cuenta tiene que crearse por fuera, con el Admin SDK.
 *
 * No requiere desplegar Functions, asi que funciona en el plan Spark.
 *
 * Contra el emulador (lo normal):
 *   npm run emu                                    # en otra terminal
 *   node seed/crear-funcionario.js jefe@teocaltiche.gob.mx --rol admin
 *
 * Contra el proyecto real (con cuidado, crea una cuenta de verdad):
 *   GOOGLE_APPLICATION_CREDENTIALS=~/llaves/miteocal-admin.json \
 *   node seed/crear-funcionario.js jefe@... --rol admin --produccion
 */
const admin = require('firebase-admin');
const { randomBytes } = require('crypto');

const ROLES = ['funcionario', 'admin', 'plataforma'];
const MUNICIPIO_POR_DEFECTO = 'teocaltiche';

const args = process.argv.slice(2);
const aProduccion = args.includes('--produccion');
const correo = args.find((a) => a.includes('@'));

function opcion(nombre, porDefecto) {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : porDefecto;
}

const rol = opcion('rol', 'funcionario');
const municipioId = opcion('municipio', MUNICIPIO_POR_DEFECTO);
let clave = opcion('clave', null);

if (!correo) {
  console.error('Falta el correo.\n');
  console.error('  node seed/crear-funcionario.js alguien@ejemplo.mx --rol admin');
  process.exit(1);
}
if (!ROLES.includes(rol)) {
  console.error(`Rol invalido: "${rol}". Usa uno de: ${ROLES.join(', ')}`);
  process.exit(1);
}

if (!aProduccion && !process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
}

admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'miteocal',
});

async function main() {
  const enEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  console.log(`Destino: ${enEmulador ? 'emulador local' : 'PRODUCCION'}\n`);

  // Que el municipio exista antes de asignarle personal.
  const municipio = await admin.firestore().collection('municipios').doc(municipioId).get();
  if (!municipio.exists) {
    console.error(`No existe municipios/${municipioId}. Corre primero: npm run sembrar`);
    process.exit(1);
  }

  if (!clave) {
    // Contrasena aleatoria; la persona la cambia en su primer acceso.
    clave = randomBytes(9).toString('base64url');
  }

  let usuario;
  try {
    usuario = await admin.auth().getUserByEmail(correo);
    console.log(`La cuenta ya existia (${usuario.uid}). Solo actualizo sus permisos.`);
  } catch {
    usuario = await admin.auth().createUser({ email: correo, password: clave });
    console.log(`Cuenta creada: ${usuario.uid}`);
  }

  await admin.auth().setCustomUserClaims(usuario.uid, { municipioId, rol });

  await admin.firestore().collection('usuarios').doc(usuario.uid).set(
    { municipioId, rol, correo, nombre: correo.split('@')[0] },
    { merge: true }
  );

  console.log(`\n  correo:    ${correo}`);
  console.log(`  municipio: ${municipioId}`);
  console.log(`  rol:       ${rol}`);
  console.log(`  clave:     ${clave}`);
  console.log('\nEntrégasela por un canal seguro y que la cambie al entrar.');
  console.log('Si ya tenia sesion abierta, debe salir y volver a entrar para');
  console.log('que el token recoja los permisos nuevos.');
}

main().catch((e) => {
  console.error('Fallo:', e.message);
  process.exit(1);
});
