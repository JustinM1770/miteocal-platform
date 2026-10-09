import {
  collection, doc, documentId, getCountFromServer, getDoc, getDocs, limit, orderBy, query, startAfter, where,
  type QueryDocumentSnapshot, type DocumentData,
} from "firebase/firestore";
import { db, firebaseListo, municipioId } from "./firebase";
import { MUNICIPIO_DEMO } from "./demo-municipio";
import { actualizar, azar, leer, type Fecha, type Pagina } from "./almacen";

/* ─── Vecinos (CRM) ─────────────────────────────────────────
   Cada persona registrada en la app vive en usuarios/{uid} (raíz), con
   municipioId, colonia, nombre, telefono, fcmTokens (ver
   docs/arquitectura-multimunicipio.md §2). Solo el ADMIN del municipio
   puede leerlos: son datos personales.

   `resumen` (boletos, gasto, calificación) lo mantiene una Cloud Function;
   el panel no recorre pagos y calificaciones de cada persona.
   ───────────────────────────────────────────────────────── */

export type TipoVecino = "local" | "paisano";

export interface Vecino {
  id?: string;
  nombre: string;
  telefono: string;
  colonia: string;
  tipo: TipoVecino;
  /** ciudad en EE. UU. para paisanos */
  origen: string | null;
  plataforma: "iOS" | "Android";
  notificaciones: boolean;
  registradoEn: Fecha;
  ultimaVez: Fecha;
  resumen?: { boletos: number; gasto: number; estrellas: number | null };
}

export interface Calificacion {
  id?: string;
  vecinoId: string;
  /* copiados al calificar, para mostrarla sin leer datos personales */
  vecinoNombre?: string;
  colonia?: string;
  tipo?: TipoVecino;
  origen?: string | null;
  estrellas: 1 | 2 | 3 | 4 | 5;
  comentario: string;
  version: string;
  creadoEn: Fecha;
  respuesta?: string | null;
}

export const ORIGENES = [
  "Los Ángeles, CA", "Santa Ana, CA", "Fresno, CA", "Chicago, IL", "Aurora, IL",
  "Dallas, TX", "Houston, TX", "Phoenix, AZ", "Denver, CO",
];

const NOMBRES = ["Ana", "Luis", "María", "José", "Rosa", "Juan", "Guadalupe", "Pedro", "Carmen", "Miguel", "Elena", "Jorge", "Patricia", "Francisco", "Laura", "Antonio", "Sofía", "Ricardo", "Teresa", "Alejandro", "Verónica", "Raúl", "Diana", "Fernando", "Claudia", "Héctor", "Martha", "Arturo", "Leticia", "Ramón"];
const APELLIDOS = ["García", "Hernández", "López", "Martínez", "González", "Pérez", "Rodríguez", "Sánchez", "Ramírez", "Torres", "Flores", "Gutiérrez", "Jiménez", "Ruiz", "Villanueva", "Delgado", "Muñoz", "Aguilar", "Castillo", "Mendoza"];
const COMENTARIOS: Record<number, string[]> = {
  5: ["Por fin sé a qué hora vuelve el agua.", "Compré mis boletos de la feria desde Chicago, muy fácil.", "Me avisó del corte un día antes, excelente.", "La transmisión de la quema del castillo se vio perfecto."],
  4: ["Muy útil, falta que salgan más negocios.", "Buena app, a veces tarda en cargar el mapa.", "Me gusta lo del camión de la basura."],
  3: ["Está bien pero el horario del camión no siempre es exacto.", "Quisiera pagar el predial con PayPal."],
  2: ["Reporté un bache hace una semana y sigue igual.", "No me llegan las notificaciones."],
  1: ["No pude registrarme, el SMS nunca llegó."],
};

const hace = (dias: number) => new Date(Date.now() - dias * 86400_000);

function generar() {
  const a = azar(42);
  const vecinos: Vecino[] = [];
  let n = 0;
  for (const c of MUNICIPIO_DEMO.colonias) {
    for (let i = 0; i < (MUNICIPIO_DEMO.vecinosPorColonia?.[c.nombre] ?? 0); i++) {
      const paisano = a.r() < 0.24;
      const registro = a.int(1, 240);
      vecinos.push({
        id: `v${++n}`,
        nombre: `${a.de(NOMBRES)} ${a.de(APELLIDOS)} ${a.de(APELLIDOS)[0]}.`,
        telefono: paisano ? `+1 ${a.int(200, 989)} ••• ${a.int(1000, 9999)}` : `346 ••• ${a.int(1000, 9999)}`,
        colonia: c.nombre,
        tipo: paisano ? "paisano" : "local",
        origen: paisano ? a.de(ORIGENES) : null,
        plataforma: a.r() < (paisano ? 0.6 : 0.3) ? "iOS" : "Android",
        notificaciones: a.r() < 0.86,
        registradoEn: hace(registro),
        ultimaVez: hace(Math.min(registro, a.r() < 0.7 ? a.int(0, 3) : a.int(4, 60))),
      });
    }
  }
  const calificaciones: Calificacion[] = [];
  for (const v of vecinos) {
    if (a.r() > 0.34) continue;
    const x = a.r();
    const e = (x < 0.55 ? 5 : x < 0.8 ? 4 : x < 0.9 ? 3 : x < 0.96 ? 2 : 1) as Calificacion["estrellas"];
    calificaciones.push({
      id: `c${calificaciones.length + 1}`, vecinoId: v.id!, vecinoNombre: v.nombre, colonia: v.colonia, tipo: v.tipo, origen: v.origen, estrellas: e,
      comentario: a.r() < 0.45 ? a.de(COMENTARIOS[e]) : "",
      version: a.de(["1.2.0", "1.3.0", "1.3.1"]), creadoEn: hace(a.int(0, 90)), respuesta: null,
    });
    v.resumen = { boletos: 0, gasto: 0, estrellas: e };
  }
  return { vecinos, calificaciones };
}

const demo = firebaseListo ? { vecinos: [], calificaciones: [] } : generar();
export const demoVecinos: Vecino[] = demo.vecinos;
const demoCalificaciones: Calificacion[] = demo.calificaciones;

/** De usuarios/{uid} al formato del CRM; tolera campos que la app aún no escribe */
function normalizar(id: string, d: DocumentData): Vecino {
  return {
    id, nombre: d.nombre ?? "Sin nombre", telefono: d.telefono ?? "", colonia: d.colonia ?? "",
    tipo: d.tipo === "paisano" || d.origen ? "paisano" : "local", origen: d.origen ?? null,
    plataforma: d.plataforma === "iOS" ? "iOS" : "Android",
    notificaciones: Array.isArray(d.fcmTokens) ? d.fcmTokens.length > 0 : Boolean(d.notificaciones),
    registradoEn: d.registradoEn ?? d.creadoEn ?? new Date(0), ultimaVez: d.ultimaVez ?? d.registradoEn ?? new Date(0),
    resumen: d.resumen,
  };
}

/** Vecinos del municipio, por páginas (orden estable por uid) */
export async function paginaVecinos(cursor: QueryDocumentSnapshot<DocumentData> | null, n = 200): Promise<Pagina<Vecino>> {
  if (!firebaseListo || !db) return { items: demoVecinos, cursor: null, hayMas: false };
  const r = [where("municipioId", "==", municipioId()), orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(n)];
  const snap = await getDocs(query(collection(db, "usuarios"), ...r));
  return { items: snap.docs.map((d) => normalizar(d.id, d.data())), cursor: snap.docs[snap.docs.length - 1] ?? null, hayMas: snap.docs.length === n };
}

/** Totales en el servidor, sin descargar a nadie */
export async function contarVecinos(filtro: { tipo?: TipoVecino; colonia?: string } = {}): Promise<number> {
  if (!firebaseListo || !db) return demoVecinos.filter((v) => (!filtro.tipo || v.tipo === filtro.tipo) && (!filtro.colonia || v.colonia === filtro.colonia)).length;
  const r = [where("municipioId", "==", municipioId())];
  if (filtro.tipo) r.push(where("tipo", "==", filtro.tipo));
  if (filtro.colonia) r.push(where("colonia", "==", filtro.colonia));
  return (await getCountFromServer(query(collection(db, "usuarios"), ...r))).data().count;
}

export async function vecinoPorId(id: string): Promise<Vecino | null> {
  if (!firebaseListo || !db) return demoVecinos.find((v) => v.id === id) ?? null;
  const d = await getDoc(doc(db, "usuarios", id));
  return d.exists() ? normalizar(d.id, d.data()) : null;
}

export const listarCalificaciones = () => leer("calificaciones", demoCalificaciones, { orden: "creadoEn", max: 1000 });

export const responderCalificacion = (c: Calificacion, respuesta: string) =>
  actualizar("calificaciones", demoCalificaciones, c.id!, { respuesta });

export const calificacionDe = async (vecinoId: string) =>
  (await leer("calificaciones", demoCalificaciones.filter((c) => c.vecinoId === vecinoId), { filtros: [["vecinoId", vecinoId]], max: 1 }))[0] ?? null;
