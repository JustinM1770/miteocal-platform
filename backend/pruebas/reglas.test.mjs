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
import { doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
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
const admin = entorno.authenticatedContext('admin1', { municipioId: MID, rol: 'admin' });

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
  // Panel
  await setDoc(doc(db, `municipios/${MID}/publicaciones/P-1`), {
    tipo: 'agua', canal: 'publico', autorUid: 'func1', publicarEn: Timestamp.fromMillis(Date.now() - 60000),
  });
  await setDoc(doc(db, `municipios/${MID}/publicaciones/P-PROG`), {
    tipo: 'corte', canal: 'publico', autorUid: 'func1', publicarEn: Timestamp.fromMillis(Date.now() + 86400000),
  });
  await setDoc(doc(db, `municipios/${MID}/certamenes/reina`), { certamen: 'reina', votacionAbierta: true });
  await setDoc(doc(db, `municipios/${MID}/certamenes/miss_chiquitita`), { certamen: 'miss_chiquitita', votacionAbierta: false });
  await setDoc(doc(db, `municipios/${MID}/pagos/PG-1`), {
    uid: 'vecino1', concepto: 'boleto', estado: 'pagado', usado: false, monto: 450, canal: 'app',
  });
  await setDoc(doc(db, `municipios/${MID}/solicitudes/S-1`), { uid: 'vecino1', estado: 'falta_documento', documentos: [] });
  await setDoc(doc(db, `municipios/${MID}/calificaciones/C-1`), { uid: 'vecino1', estrellas: 4, vecinoNombre: 'Vecino' });
  await setDoc(doc(db, `municipios/${MID}/escuelas/cbtis-247`), { nombre: 'CBTIS 247', activa: true, seguidores: 10 });
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

// ═══ Colecciones del panel ════════════════════════════════════════════════

// ─── Historial inmutable ─────────────────────────────────────────────────
probar('el funcionario publica a su nombre', () =>
  assertSucceeds(setDoc(doc(funcionario.firestore(), `municipios/${MID}/publicaciones/P-2`), {
    tipo: 'noticia', canal: 'publico', autorUid: 'func1', publicarEn: Timestamp.now(),
  })));

probar('el funcionario NO publica a nombre de otro', () =>
  assertFails(setDoc(doc(funcionario.firestore(), `municipios/${MID}/publicaciones/P-3`), {
    tipo: 'noticia', canal: 'publico', autorUid: 'otro', publicarEn: Timestamp.now(),
  })));

probar('nadie edita una publicacion ya hecha', () =>
  assertFails(updateDoc(doc(funcionario.firestore(), `municipios/${MID}/publicaciones/P-1`), { titulo: 'cambiado' })));

probar('cualquiera lee una publicacion publica que ya salio', () =>
  assertSucceeds(getDoc(doc(anonimo.firestore(), `municipios/${MID}/publicaciones/P-1`))));

probar('una publicacion programada NO se ve antes de tiempo', () =>
  assertFails(getDoc(doc(anonimo.firestore(), `municipios/${MID}/publicaciones/P-PROG`))));

probar('la bitacora no se puede borrar', () =>
  assertFails(deleteDoc(doc(funcionario.firestore(), `municipios/${MID}/auditoria/A-1`))));

probar('un vecino NO encola notificaciones', () =>
  assertFails(setDoc(doc(vecino.firestore(), `municipios/${MID}/notificaciones/N-1`), { estado: 'pendiente' })));

probar('el funcionario encola una notificacion pendiente', () =>
  assertSucceeds(setDoc(doc(funcionario.firestore(), `municipios/${MID}/notificaciones/N-2`), { estado: 'pendiente', titulo: 'x' })));

probar('el funcionario NO marca una notificacion como enviada', () =>
  assertFails(setDoc(doc(funcionario.firestore(), `municipios/${MID}/notificaciones/N-3`), { estado: 'enviada' })));

// ─── Votos: uno por vecino y certamen ────────────────────────────────────
probar('un vecino vota con id <certamen>_<uid>', () =>
  assertSucceeds(setDoc(doc(vecino.firestore(), `municipios/${MID}/votos/reina_vecino1`), {
    uid: 'vecino1', certamen: 'reina', candidataId: 'k1',
  })));

probar('un vecino NO vota con otro id (segundo voto)', () =>
  assertFails(setDoc(doc(vecino.firestore(), `municipios/${MID}/votos/reina_vecino1_bis`), {
    uid: 'vecino1', certamen: 'reina', candidataId: 'k2',
  })));

probar('un vecino NO cambia su voto', () =>
  assertFails(updateDoc(doc(vecino.firestore(), `municipios/${MID}/votos/reina_vecino1`), { candidataId: 'k2' })));

probar('nadie vota con la votacion cerrada', () =>
  assertFails(setDoc(doc(vecino.firestore(), `municipios/${MID}/votos/miss_chiquitita_vecino1`), {
    uid: 'vecino1', certamen: 'miss_chiquitita', candidataId: 'k5',
  })));

// ─── Pagos ───────────────────────────────────────────────────────────────
probar('el vecino lee su pago', () =>
  assertSucceeds(getDoc(doc(vecino.firestore(), `municipios/${MID}/pagos/PG-1`))));

probar('otro vecino NO lee ese pago', () =>
  assertFails(getDoc(doc(otroVecino.firestore(), `municipios/${MID}/pagos/PG-1`))));

probar('un vecino NO se crea un pago (lo hara la pasarela)', () =>
  assertFails(setDoc(doc(vecino.firestore(), `municipios/${MID}/pagos/PG-2`), { uid: 'vecino1', canal: 'app', estado: 'pagado' })));

probar('el funcionario registra venta de taquilla', () =>
  assertSucceeds(setDoc(doc(funcionario.firestore(), `municipios/${MID}/pagos/PG-3`), { uid: null, canal: 'taquilla', estado: 'pagado' })));

probar('el funcionario valida el boleto en la entrada', () =>
  assertSucceeds(updateDoc(doc(funcionario.firestore(), `municipios/${MID}/pagos/PG-1`), { usado: true })));

probar('el funcionario NO cambia el monto de un pago', () =>
  assertFails(updateDoc(doc(funcionario.firestore(), `municipios/${MID}/pagos/PG-1`), { monto: 1 })));

// ─── Tramites ────────────────────────────────────────────────────────────
probar('el vecino re-sube documentos cuando se los piden', () =>
  assertSucceeds(updateDoc(doc(vecino.firestore(), `municipios/${MID}/solicitudes/S-1`), { documentos: [{ nombre: 'INE' }], estado: 'recibida' })));

probar('el vecino NO se marca su tramite como listo', () =>
  assertFails(updateDoc(doc(vecino.firestore(), `municipios/${MID}/solicitudes/S-1`), { estado: 'lista' })));

// ─── Calificaciones: datos personales, solo admin ────────────────────────
probar('el funcionario NO lee calificaciones (CRM)', () =>
  assertFails(getDoc(doc(funcionario.firestore(), `municipios/${MID}/calificaciones/C-1`))));

probar('el admin si lee calificaciones', () =>
  assertSucceeds(getDoc(doc(admin.firestore(), `municipios/${MID}/calificaciones/C-1`))));

probar('el admin responde sin tocar las estrellas', () =>
  assertSucceeds(updateDoc(doc(admin.firestore(), `municipios/${MID}/calificaciones/C-1`), { respuesta: 'Gracias' })));

probar('el admin NO cambia las estrellas', () =>
  assertFails(updateDoc(doc(admin.firestore(), `municipios/${MID}/calificaciones/C-1`), { estrellas: 5 })));

// ─── Escuelas: los seguidores los cuenta el servidor ─────────────────────
probar('cualquiera lee las escuelas', () =>
  assertSucceeds(getDoc(doc(anonimo.firestore(), `municipios/${MID}/escuelas/cbtis-247`))));

probar('el funcionario edita los datos de la escuela', () =>
  assertSucceeds(updateDoc(doc(funcionario.firestore(), `municipios/${MID}/escuelas/cbtis-247`), { director: 'Mtra. Ruiz' })));

probar('el funcionario NO altera los seguidores', () =>
  assertFails(updateDoc(doc(funcionario.firestore(), `municipios/${MID}/escuelas/cbtis-247`), { seguidores: 9999 })));

probar('el funcionario NO crea una escuela con seguidores inventados', () =>
  assertFails(setDoc(doc(funcionario.firestore(), `municipios/${MID}/escuelas/nueva`), { nombre: 'Nueva', seguidores: 500 })));

// ─── Compras simuladas ───────────────────────────────────────────────────
probar('el funcionario registra una compra simulada marcada', () =>
  assertSucceeds(setDoc(doc(funcionario.firestore(), `municipios/${MID}/pagos/SIM-1`), { canal: 'simulacion', simulado: true, estado: 'pendiente' })));

probar('una compra simulada sin marca se rechaza', () =>
  assertFails(setDoc(doc(funcionario.firestore(), `municipios/${MID}/pagos/SIM-2`), { canal: 'simulacion', estado: 'pagado' })));

probar('el funcionario NO crea un pago "en linea" haciendolo pasar por real', () =>
  assertFails(setDoc(doc(funcionario.firestore(), `municipios/${MID}/pagos/SIM-3`), { canal: 'app', simulado: true, estado: 'pagado' })));

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
