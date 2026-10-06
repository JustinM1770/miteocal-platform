import {
  collection, getDocs, query, where, addDoc, updateDoc, doc, Timestamp,
} from "firebase/firestore";
import { db, firebaseListo, MUNICIPIO_ID } from "./firebase";

/* Lectura y escritura genérica para las colecciones de feria, pagos y
   vecinos. En modo demo trabaja sobre el arreglo en memoria que se le pasa. */

export type Fecha = Date | Timestamp;

export function f(v: Fecha | null | undefined): Date {
  if (!v) return new Date(0);
  return v instanceof Date ? v : v.toDate();
}

export async function leer<T extends { id?: string }>(col: string, demo: T[]): Promise<T[]> {
  if (!firebaseListo || !db) return demo;
  const snap = await getDocs(query(collection(db, col), where("municipioId", "==", MUNICIPIO_ID)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export async function crear<T extends { id?: string }>(col: string, demo: T[], data: Omit<T, "id">): Promise<T> {
  if (!firebaseListo || !db) {
    const nuevo = { ...data, id: `${col}-${Date.now()}` } as T;
    demo.unshift(nuevo);
    return nuevo;
  }
  const ref = await addDoc(collection(db, col), { ...data, municipioId: MUNICIPIO_ID });
  return { ...data, id: ref.id } as T;
}

export async function actualizar<T extends { id?: string }>(col: string, demo: T[], id: string, cambios: Partial<T>): Promise<void> {
  if (!firebaseListo || !db) {
    const x = demo.find((d) => d.id === id);
    if (x) Object.assign(x, cambios);
    return;
  }
  await updateDoc(doc(db, col, id), cambios as Record<string, unknown>);
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
