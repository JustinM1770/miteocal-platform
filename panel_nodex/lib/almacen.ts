import {
  getDocs, query, addDoc, updateDoc, setDoc, orderBy, limit, startAfter, where,
  getCountFromServer, runTransaction, Timestamp,
  type QueryConstraint, type QueryDocumentSnapshot, type DocumentData,
} from "firebase/firestore";
import { coleccion, db, documento, firebaseListo, municipioId } from "./firebase";

/* Lectura y escritura genérica para las colecciones del municipio
   (municipios/{id}/{col}). En modo demo trabaja sobre el arreglo en
   memoria que se le pasa. */

export type Fecha = Date | Timestamp;

export function f(v: Fecha | null | undefined): Date {
  if (!v) return new Date(0);
  return v instanceof Date ? v : v.toDate();
}

/** Tope de seguridad: ninguna pantalla trae una colección completa sin límite */
export const MAX_LECTURA = 2000;

export async function leer<T extends { id?: string }>(
  col: string, demo: T[], opciones: { orden?: string; max?: number; filtros?: [string, unknown][] } = {},
): Promise<T[]> {
  if (!firebaseListo || !db) return demo;
  const restricciones: QueryConstraint[] = (opciones.filtros ?? []).map(([c, v]) => where(c, "==", v));
  if (opciones.orden) restricciones.push(orderBy(opciones.orden, "desc"));
  restricciones.push(limit(opciones.max ?? MAX_LECTURA));
  const snap = await getDocs(query(coleccion(col), ...restricciones));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as T));
}

export interface Pagina<T> { items: T[]; cursor: QueryDocumentSnapshot<DocumentData> | null; hayMas: boolean }

/** Página de una colección ordenada; `cursor` es el último documento de la página anterior */
export async function leerPagina<T extends { id?: string }>(
  col: string, demo: T[], orden: string, n: number, cursor: QueryDocumentSnapshot<DocumentData> | null,
  filtros: [string, unknown][] = [],
): Promise<Pagina<T>> {
  if (!firebaseListo || !db) return { items: demo, cursor: null, hayMas: false };
  const r: QueryConstraint[] = [...filtros.map(([c, v]) => where(c, "==", v)), orderBy(orden, "desc")];
  if (cursor) r.push(startAfter(cursor));
  r.push(limit(n));
  const snap = await getDocs(query(coleccion(col), ...r));
  return {
    items: snap.docs.map((d) => ({ ...d.data(), id: d.id } as T)),
    cursor: snap.docs[snap.docs.length - 1] ?? null,
    hayMas: snap.docs.length === n,
  };
}

/** Cuenta en el servidor, sin descargar documentos */
export async function contar<T>(col: string, demo: T[], filtros: [string, unknown][] = []): Promise<number> {
  if (!firebaseListo || !db) {
    return demo.filter((x) => filtros.every(([c, v]) => (x as Record<string, unknown>)[c] === v)).length;
  }
  const snap = await getCountFromServer(query(coleccion(col), ...filtros.map(([c, v]) => where(c, "==", v))));
  return snap.data().count;
}

export async function crear<T extends { id?: string }>(col: string, demo: T[], data: Omit<T, "id">, id?: string): Promise<T> {
  if (!firebaseListo || !db) {
    const nuevo = { ...data, id: id ?? `${col}-${Date.now()}-${Math.round(Math.random() * 1e6)}` } as T;
    demo.unshift(nuevo);
    return nuevo;
  }
  const datos = { ...data, municipioId: municipioId() };
  if (id) { await setDoc(documento(col, id), datos); return { ...data, id } as T; }
  const ref = await addDoc(coleccion(col), datos);
  return { ...data, id: ref.id } as T;
}

export async function actualizar<T extends { id?: string }>(col: string, demo: T[], id: string, cambios: Partial<T>): Promise<void> {
  if (!firebaseListo || !db) {
    const x = demo.find((d) => d.id === id);
    if (x) Object.assign(x, cambios);
    return;
  }
  // `id` vive en la ruta, no en el documento
  const { id: _omitido, ...resto } = cambios as Record<string, unknown>;
  void _omitido;
  await updateDoc(documento(col, id), resto);
}

/* ─── Folios consecutivos ───────────────────────────────────
   Mismo contador que usa la Cloud Function de reportes:
   municipios/{id}/config/contadores, un campo por tipo. Se incrementa en una
   transacción: dos taquillas al mismo tiempo nunca reciben el mismo folio. */
const contadoresDemo: Record<string, number> = {};

export async function siguienteFolio(tipo: string, prefijo: string, inicio = 10000): Promise<string> {
  if (!firebaseListo || !db) {
    contadoresDemo[tipo] = (contadoresDemo[tipo] ?? inicio) + 1;
    return `${prefijo}-${contadoresDemo[tipo]}`;
  }
  const ref = documento("config", "contadores");
  const n = await runTransaction(db, async (tx) => {
    const actual = (await tx.get(ref)).get(tipo) ?? inicio;
    tx.set(ref, { [tipo]: actual + 1 }, { merge: true });
    return actual + 1;
  });
  return `${prefijo}-${n}`;
}

/** Generador pseudoaleatorio con semilla: los datos demo salen iguales en cada recarga */
export function azar(semilla: number) {
  let a = semilla;
  const r = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    r,
    int: (min: number, max: number) => Math.floor(r() * (max - min + 1)) + min,
    de: <T,>(l: readonly T[]) => l[Math.floor(r() * l.length)],
  };
}

export const pesos = (n: number, moneda = "MXN") =>
  n.toLocaleString("es-MX", { style: "currency", currency: moneda, maximumFractionDigits: 0 });

/** Fecha local AAAA-MM-DD (la de un <input type="date">), sin desfase por UTC */
export const diaLocal = (d: Date = new Date()) => d.toLocaleDateString("en-CA");
