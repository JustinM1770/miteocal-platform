/**
 * Pruebas de firestore.rules.
 *
 * Cubren sobre todo los dos huecos que traia la version documentada:
 *  1. los reportes ciudadanos quedaban publicos por un comodin de lectura
 *  2. un vecino podia ascenderse a admin editando su propio perfil
 *
 * Correr con:  npm run probar:reglas
 */
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import assert from 'node:assert';

const MID = 'teocaltiche';
const OTRO = 'villa-hidalgo';

const entorno = await initializeTestEnvironment({
  projectId: 'demo-miteocal',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

const vecino = entorno.authenticatedContext('vecino1', { municipioId: MID, rol: 'vecino' });
const otroVecino = entorno.authenticatedContext('vecino2', { municipioId: MID, rol: 'vecino' });
const funcionario = entorno.authenticatedContext('func1', { municipioId: MID, rol: 'funcionario' });
const funcionarioAjeno = entorno.authenticatedContext('func2', { municipioId: OTRO, rol: 'funcionario' });
const anonimo = entorno.unauthenticatedContext();

// Sembrar sin pasar por las reglas.
await entorno.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, `municipios/${MID}`), { nombre: 'Teocaltiche' });
  await setDoc(doc(db, `municipios/${MID}/reportes/R-1`), {
    uid: 'vecino1', tipo: 'bache', estado: 'recibido',
  });
  await setDoc(doc(db, `municipios/${MID}/noticias/N-1`), { titulo: 'Aviso' });
  await setDoc(doc(db, 'usuarios/vecino1'), {
    nombre: 'Vecino', municipioId: MID, rol: 'vecino',
  });
});

const pruebas = [];
const probar = (nombre, fn) => pruebas.push([nombre, fn]);

// ─── Lo publico es publico ───────────────────────────────────────────────
probar('cualquiera lee la identidad del municipio sin sesion', () =>
  assertSucceeds(getDoc(doc(anonimo.firestore(), `municipios/${MID}`))));

probar('cualquiera lee las noticias', () =>
  assertSucceeds(getDoc(doc(anonimo.firestore(), `municipios/${MID}/noticias/N-1`))));

// ─── Hueco 1: los reportes NO son publicos ───────────────────────────────
probar('un anonimo NO lee un reporte ciudadano', () =>
  assertFails(getDoc(doc(anonimo.firestore(), `municipios/${MID}/reportes/R-1`))));

probar('otro vecino NO lee el reporte ajeno', () =>
  assertFails(getDoc(doc(otroVecino.firestore(), `municipios/${MID}/reportes/R-1`))));

probar('el autor si lee su propio reporte', () =>
  assertSucceeds(getDoc(doc(vecino.firestore(), `municipios/${MID}/reportes/R-1`))));

probar('el funcionario del municipio si lo lee', () =>
  assertSucceeds(getDoc(doc(funcionario.firestore(), `municipios/${MID}/reportes/R-1`))));

// ─── Separacion entre municipios ─────────────────────────────────────────
probar('un funcionario de OTRO municipio NO lee el reporte', () =>
  assertFails(getDoc(doc(funcionarioAjeno.firestore(), `municipios/${MID}/reportes/R-1`))));

probar('un funcionario de OTRO municipio NO publica noticias aqui', () =>
  assertFails(setDoc(doc(funcionarioAjeno.firestore(), `municipios/${MID}/noticias/N-2`), { titulo: 'x' })));

probar('el funcionario propio si publica noticias', () =>
  assertSucceeds(setDoc(doc(funcionario.firestore(), `municipios/${MID}/noticias/N-2`), { titulo: 'ok' })));

// ─── Reportes: reglas de escritura ───────────────────────────────────────
probar('un vecino crea su reporte', () =>
  assertSucceeds(setDoc(doc(vecino.firestore(), `municipios/${MID}/reportes/R-2`), {
    uid: 'vecino1', tipo: 'fuga', estado: 'recibido',
  })));

probar('un vecino NO crea un reporte a nombre de otro', () =>
  assertFails(setDoc(doc(vecino.firestore(), `municipios/${MID}/reportes/R-3`), {
    uid: 'vecino2', tipo: 'fuga', estado: 'recibido',
  })));

probar('nadie borra un reporte, ni el funcionario', () =>
  assertFails(deleteDoc(doc(funcionario.firestore(), `municipios/${MID}/reportes/R-1`))));

// ─── Hueco 2: nadie se asciende solo ─────────────────────────────────────
probar('un vecino NO se pone rol de admin', () =>
  assertFails(updateDoc(doc(vecino.firestore(), 'usuarios/vecino1'), { rol: 'admin' })));

probar('un vecino NO se cambia de municipio', () =>
  assertFails(updateDoc(doc(vecino.firestore(), 'usuarios/vecino1'), { municipioId: OTRO })));

probar('un vecino si edita su nombre', () =>
  assertSucceeds(updateDoc(doc(vecino.firestore(), 'usuarios/vecino1'), { nombre: 'Nuevo' })));

probar('un campo nuevo no listado queda cerrado por omision', () =>
  assertFails(updateDoc(doc(vecino.firestore(), 'usuarios/vecino1'), { esSuperUsuario: true })));

probar('un vecino NO lee el perfil de otro', () =>
  assertFails(getDoc(doc(vecino.firestore(), 'usuarios/vecino2'))));

// ─── Correr ──────────────────────────────────────────────────────────────
let ok = 0, fallo = 0;
for (const [nombre, fn] of pruebas) {
  try {
    await fn();
    console.log(`  ok   ${nombre}`);
    ok++;
  } catch (e) {
    console.log(`  FALLA ${nombre}\n        ${e.message?.split('\n')[0]}`);
    fallo++;
  }
}
await entorno.cleanup();
console.log(`\n${ok} pasaron, ${fallo} fallaron`);
assert.strictEqual(fallo, 0, 'hay reglas de seguridad que no se cumplen');
