/**
 * Cloud Functions de MiTeocal.
 *
 * Aqui vive SOLO lo que necesita privilegios que el cliente no puede tener.
 * Todo lo demas (leer noticias, listar comercios, ver el agua) lo hace la app
 * directo contra Firestore, y lo autoriza firestore.rules.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
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

  const { uid, municipioId, rol, area } = req.data || {};
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

  // `area` (opcional) dice a qué dependencia pertenece el personal; el panel la usa
  // para mostrar a cada área lo suyo.
  const nuevosClaims = { municipioId, rol, ...(area ? { area: String(area) } : {}) };
  await admin.auth().setCustomUserClaims(uid, nuevosClaims);

  // Espejo en el perfil, para que el panel pueda listar personal sin consultar Auth.
  // El cliente no puede escribir estos campos: lo impide firestore.rules.
  await db.collection('usuarios').doc(uid).set({ municipioId, rol, area: area || null }, { merge: true });

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

/* ═══ Notificaciones ════════════════════════════════════════════════════════
   El panel (y el CRM) encolan en municipios/{mid}/notificaciones con
   { titulo, cuerpo, colonias[], segmento, programadaPara, estado: 'pendiente' }.
   Aquí se resuelve a quién le llega, se envía por FCM y se deja el resultado
   en el mismo documento. El cliente no puede marcar nada como enviado. */

const LOTE_FCM = 500;          // máximo de tokens por llamada a FCM
const LOTE_IN = 30;            // máximo de valores en un filtro "in" de Firestore

/** uids de quienes compraron (pagado) boletos de un evento, o de cualquiera */
async function compradores(mid, eventoId) {
  let q = db.collection(`municipios/${mid}/pagos`).where('concepto', '==', 'boleto').where('estado', '==', 'pagado');
  if (eventoId && eventoId !== 'cualquier-evento') q = q.where('eventoId', '==', eventoId);
  const snap = await q.select('uid').get();
  return new Set(snap.docs.map((d) => d.get('uid')).filter(Boolean));
}

/** Tokens FCM de los vecinos a los que va la notificación */
async function destinatarios(mid, n) {
  const seg = n.segmento || {};
  const perfiles = [];

  if (Array.isArray(seg.uids) && seg.uids.length) {
    for (let i = 0; i < seg.uids.length; i += LOTE_IN) {
      const snap = await db.collection('usuarios').where(admin.firestore.FieldPath.documentId(), 'in', seg.uids.slice(i, i + LOTE_IN)).get();
      perfiles.push(...snap.docs);
    }
  } else {
    const base = () => {
      let q = db.collection('usuarios').where('municipioId', '==', mid);
      if (seg.tipo) q = q.where('tipo', '==', seg.tipo);
      return q;
    };
    const colonias = Array.isArray(n.colonias) && n.colonias.length ? n.colonias : null;
    if (colonias) {
      for (let i = 0; i < colonias.length; i += LOTE_IN) {
        perfiles.push(...(await base().where('colonia', 'in', colonias.slice(i, i + LOTE_IN)).get()).docs);
      }
    } else {
      perfiles.push(...(await base().get()).docs);
    }
  }

  let lista = perfiles.filter((d) => d.get('municipioId') === mid);
  if (seg.compradoresDe) {
    const quienes = await compradores(mid, seg.compradoresDe);
    lista = lista.filter((d) => quienes.has(d.id));
  }
  const tokens = new Map();   // token -> uid, para limpiar los inválidos
  for (const d of lista) for (const t of d.get('fcmTokens') || []) tokens.set(t, d.id);
  return { tokens, personas: lista.length };
}

async function enviar(ref) {
  // Se reclama dentro de una transacción para que la función programada y el
  // disparador nunca envíen la misma notificación dos veces.
  const n = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists || doc.get('estado') !== 'pendiente') return null;
    tx.update(ref, { estado: 'enviando' });
    return doc.data();
  });
  if (!n) return;

  const mid = ref.parent.parent.id;
  try {
    const { tokens, personas } = await destinatarios(mid, n);
    const lista = [...tokens.keys()];
    let enviados = 0, fallidos = 0;
    const invalidos = [];
    for (let i = 0; i < lista.length; i += LOTE_FCM) {
      const lote = lista.slice(i, i + LOTE_FCM);
      const r = await admin.messaging().sendEachForMulticast({
        tokens: lote,
        notification: { title: n.titulo, body: n.cuerpo },
        data: { municipioId: mid, origen: n.origen?.coleccion || '', id: n.origen?.id || '' },
      });
      enviados += r.successCount; fallidos += r.failureCount;
      r.responses.forEach((x, k) => {
        const code = x.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) invalidos.push(lote[k]);
      });
    }
    // Tokens de teléfonos que ya no existen: se quitan del perfil
    await Promise.all(invalidos.map((t) => db.doc(`usuarios/${tokens.get(t)}`).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(t),
    }).catch(() => null)));
    await ref.update({ estado: 'enviada', personas, enviados, fallidos, enviadaEn: admin.firestore.FieldValue.serverTimestamp() });
  } catch (e) {
    logger.error('No se pudo enviar la notificación', ref.path, e);
    await ref.update({ estado: 'fallida', error: String(e.message || e) });
  }
}

/** Al encolarse: si no está programada para después, sale de inmediato */
exports.procesarNotificacion = onDocumentCreated(
  'municipios/{municipioId}/notificaciones/{id}',
  async (evento) => {
    const snap = evento.data;
    if (!snap) return;
    const cuando = snap.get('programadaPara');
    if (cuando && cuando.toMillis() > Date.now() + 60 * 1000) return;   // la tomará enviarProgramadas
    await enviar(snap.ref);
  }
);

/** Cada 5 minutos: las programadas (y publicaciones programadas) que ya les toca */
exports.enviarProgramadas = onSchedule('every 5 minutes', async () => {
  const snap = await db.collectionGroup('notificaciones')
    .where('estado', '==', 'pendiente')
    .where('programadaPara', '<=', admin.firestore.Timestamp.now())
    .limit(100).get();
  for (const d of snap.docs) await enviar(d.ref);
});

/* ═══ Estadísticas para el panel ════════════════════════════════════════════
   El panel no puede contar vecinos (usuarios/ es privado para el funcionario).
   Esto mantiene municipios/{mid}/config/estadisticas.vecinosPorColonia, que es
   lo que usa para decir «le llega a N vecinos». */

const esVecino = (d) => d && (!d.rol || d.rol === 'vecino') && d.municipioId;

exports.estadisticasVecinos = onDocumentWritten('usuarios/{uid}', async (evento) => {
  const antes = evento.data?.before?.data();
  const despues = evento.data?.after?.data();
  const clave = (d) => (esVecino(d) ? `${d.municipioId}|${d.colonia || 'Sin colonia'}` : null);
  const a = clave(antes), b = clave(despues);
  if (a === b) return;

  const mover = async (k, delta) => {
    if (!k) return;
    const [mid, colonia] = k.split('|');
    await db.doc(`municipios/${mid}/config/estadisticas`).set({
      vecinosPorColonia: { [colonia]: admin.firestore.FieldValue.increment(delta) },
      total: admin.firestore.FieldValue.increment(delta),
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  };
  await Promise.all([mover(a, -1), mover(b, +1)]);
});

/* ═══ Resumen por vecino para el CRM ════════════════════════════════════════
   usuarios/{uid}.resumen = { boletos, gasto, estrellas }. El CRM lo muestra y
   filtra sin recorrer los pagos y calificaciones de cada persona. */

async function recalcularResumen(mid, uid) {
  if (!uid) return;
  const [pagos, cal] = await Promise.all([
    db.collection(`municipios/${mid}/pagos`).where('uid', '==', uid).where('concepto', '==', 'boleto').where('estado', '==', 'pagado').get(),
    db.collection(`municipios/${mid}/calificaciones`).where('uid', '==', uid).limit(1).get(),
  ]);
  const boletos = pagos.docs.reduce((s, d) => s + (d.get('cantidad') || 0), 0);
  const gasto = pagos.docs.reduce((s, d) => s + (d.get('monto') || 0), 0);
  const estrellas = cal.empty ? null : cal.docs[0].get('estrellas');
  await db.doc(`usuarios/${uid}`).set({ resumen: { boletos, gasto, estrellas } }, { merge: true });
}

const alCambiar = (coleccion) => onDocumentWritten(`municipios/{municipioId}/${coleccion}/{id}`, async (evento) => {
  const uids = new Set([evento.data?.before?.get('uid'), evento.data?.after?.get('uid')].filter(Boolean));
  for (const uid of uids) await recalcularResumen(evento.params.municipioId, uid);
});

exports.resumenPorPago = alCambiar('pagos');
exports.resumenPorCalificacion = alCambiar('calificaciones');

/* ═══ Personal del municipio (desde el panel) ═══════════════════════════════
   Solo un admin del MISMO municipio (o plataforma). El rol y el municipio son
   custom claims: por eso esto vive aquí y no en el cliente. */

const ROLES_PERSONAL = ['funcionario', 'admin'];

function exigirAdmin(req, municipioId) {
  const c = req.auth?.token || {};
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesion.');
  if (c.rol === 'plataforma') return;
  if (c.rol !== 'admin' || c.municipioId !== municipioId) {
    throw new HttpsError('permission-denied', 'Solo un administrador de este municipio puede hacerlo.');
  }
}

/** Da de alta a una persona del ayuntamiento. Devuelve un enlace para que cree su contraseña. */
exports.crearPersonal = onCall(async (req) => {
  const { correo, nombre, rol = 'funcionario', area = null } = req.data || {};
  const municipioId = req.auth?.token?.rol === 'plataforma' ? req.data?.municipioId : req.auth?.token?.municipioId;
  exigirAdmin(req, municipioId);
  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new HttpsError('invalid-argument', 'Correo invalido.');
  if (!ROLES_PERSONAL.includes(rol)) throw new HttpsError('invalid-argument', `Rol invalido: ${rol}`);

  let usuario;
  let nueva = false;
  try {
    usuario = await admin.auth().getUserByEmail(correo);
    const c = usuario.customClaims || {};
    if (c.municipioId && c.municipioId !== municipioId) {
      throw new HttpsError('already-exists', 'Esa cuenta pertenece a otro municipio.');
    }
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    usuario = await admin.auth().createUser({ email: correo, displayName: nombre || undefined, emailVerified: false });
    nueva = true;
  }

  await admin.auth().setCustomUserClaims(usuario.uid, { municipioId, rol, ...(area ? { area } : {}) });
  await db.collection('usuarios').doc(usuario.uid).set({
    municipioId, rol, area, correo, activo: true,
    ...(nombre ? { nombre } : {}),
    altaPor: req.auth.uid, altaEn: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // La persona define su contraseña con este enlace; nadie la ve ni la manda por chat
  const enlace = await admin.auth().generatePasswordResetLink(correo);
  await db.collection(`municipios/${municipioId}/auditoria`).add({
    accion: nueva ? 'Dio de alta personal' : 'Asignó permisos a cuenta existente',
    detalle: `${correo} · ${rol}${area ? ` · ${area}` : ''}`, canal: 'interno',
    autorUid: req.auth.uid, autorNombre: req.auth.token.name || req.auth.token.email || 'Admin',
    creadoEn: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { uid: usuario.uid, nueva, enlace };
});

/** Cambia rol o área, o desactiva / reactiva una cuenta del personal */
exports.actualizarPersonal = onCall(async (req) => {
  const { uid, rol, area, activo } = req.data || {};
  if (!uid) throw new HttpsError('invalid-argument', 'Falta uid.');
  const usuario = await admin.auth().getUser(uid).catch(() => null);
  if (!usuario) throw new HttpsError('not-found', 'No existe esa cuenta.');
  const actuales = usuario.customClaims || {};
  exigirAdmin(req, actuales.municipioId);
  if (uid === req.auth.uid && (activo === false || (rol && rol !== actuales.rol))) {
    throw new HttpsError('failed-precondition', 'No puedes quitarte tus propios permisos.');
  }
  if (rol && !ROLES_PERSONAL.includes(rol)) throw new HttpsError('invalid-argument', `Rol invalido: ${rol}`);

  const claims = { ...actuales, ...(rol ? { rol } : {}) };
  if (area !== undefined) { if (area) claims.area = area; else delete claims.area; }
  await admin.auth().setCustomUserClaims(uid, claims);
  if (activo !== undefined) {
    await admin.auth().updateUser(uid, { disabled: !activo });
    // Al desactivar se cierran sus sesiones abiertas
    if (activo === false) await admin.auth().revokeRefreshTokens(uid);
  }
  await db.collection('usuarios').doc(uid).set({
    rol: claims.rol, area: claims.area || null, ...(activo !== undefined ? { activo } : {}),
  }, { merge: true });

  const cambios = [rol && `rol ${rol}`, area !== undefined && `área ${area || 'ninguna'}`, activo === false && 'desactivada', activo === true && 'reactivada'].filter(Boolean).join(', ');
  await db.collection(`municipios/${actuales.municipioId}/auditoria`).add({
    accion: 'Cambió permisos de personal', detalle: `${usuario.email} · ${cambios}`, canal: 'interno',
    autorUid: req.auth.uid, autorNombre: req.auth.token.name || req.auth.token.email || 'Admin',
    creadoEn: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

/** Cuántos papás siguen cada escuela: usuarios/{uid}.escuelas[] (ids) → escuelas/{id}.seguidores */
exports.seguidoresEscuelas = onDocumentWritten('usuarios/{uid}', async (evento) => {
  const antes = evento.data?.before?.data() || {};
  const despues = evento.data?.after?.data() || {};
  const a = new Set(antes.municipioId ? antes.escuelas || [] : []);
  const b = new Set(despues.municipioId ? despues.escuelas || [] : []);
  const cambio = (mid, id, delta) => db.doc(`municipios/${mid}/escuelas/${id}`)
    .update({ seguidores: admin.firestore.FieldValue.increment(delta) }).catch(() => null);   // la escuela pudo borrarse
  const tareas = [];
  for (const id of a) if (!b.has(id) || antes.municipioId !== despues.municipioId) tareas.push(cambio(antes.municipioId, id, -1));
  for (const id of b) if (!a.has(id) || antes.municipioId !== despues.municipioId) tareas.push(cambio(despues.municipioId, id, +1));
  await Promise.all(tareas);
});
