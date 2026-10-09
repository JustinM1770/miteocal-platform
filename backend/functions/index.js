/**
 * Cloud Functions de MiTeocal.
 *
 * Aqui vive SOLO lo que necesita privilegios que el cliente no puede tener.
 * Todo lo demas (leer noticias, listar comercios, ver el agua) lo hace la app
 * directo contra Firestore, y lo autoriza firestore.rules.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const ROLES = ['vecino', 'funcionario', 'admin'];

/**
 * Asigna municipio y rol a una persona.
 *
 * Es la funcion mas delicada del sistema: escribe el custom claim del que
 * dependen TODAS las reglas de seguridad. Solo la puede llamar un admin del
 * mismo municipio, o el rol plataforma.
 */
exports.asignarMunicipio = onCall(async (req) => {
  const quienLlama = req.auth;
  if (!quienLlama) {
    throw new HttpsError('unauthenticated', 'Inicia sesion.');
  }

  const { uid, municipioId, rol } = req.data || {};
  if (!uid || !municipioId || !rol) {
    throw new HttpsError('invalid-argument', 'Faltan uid, municipioId o rol.');
  }
  if (!ROLES.includes(rol)) {
    throw new HttpsError('invalid-argument', `Rol invalido: ${rol}`);
  }

  const claims = quienLlama.token || {};
  const esPlataforma = claims.rol === 'plataforma';
  const esAdminDelMismo = claims.rol === 'admin' && claims.municipioId === municipioId;

  if (!esPlataforma && !esAdminDelMismo) {
    throw new HttpsError('permission-denied', 'No puedes asignar en ese municipio.');
  }

  const municipio = await db.collection('municipios').doc(municipioId).get();
  if (!municipio.exists) {
    throw new HttpsError('not-found', `No existe el municipio ${municipioId}.`);
  }

  await admin.auth().setCustomUserClaims(uid, { municipioId, rol });

  // Espejo en el perfil, para que el panel pueda listar personal sin consultar Auth.
  // El cliente no puede escribir estos dos campos: lo impide firestore.rules.
  await db.collection('usuarios').doc(uid).set({ municipioId, rol }, { merge: true });

  // El token viejo sigue siendo valido hasta una hora; la app debe llamar a
  // getIdToken(true) despues de esto para refrescar los claims.
  return { ok: true, uid, municipioId, rol };
});

/**
 * Asigna el folio de seguimiento cuando entra un reporte ciudadano.
 * Se hace en servidor para que sea consecutivo y no lo pueda falsear el cliente.
 */
exports.generarFolio = onDocumentCreated(
  'municipios/{municipioId}/reportes/{reporteId}',
  async (evento) => {
    const snap = evento.data;
    if (!snap || snap.get('folio')) return;

    const { municipioId } = evento.params;
    const contador = db.doc(`municipios/${municipioId}/config/contadores`);

    const folio = await db.runTransaction(async (tx) => {
      const doc = await tx.get(contador);
      const siguiente = (doc.exists ? doc.get('reportes') || 0 : 0) + 1;
      tx.set(contador, { reportes: siguiente }, { merge: true });
      return `R-${new Date().getFullYear()}-${String(siguiente).padStart(5, '0')}`;
    });

    await snap.ref.update({
      folio,
      creadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
