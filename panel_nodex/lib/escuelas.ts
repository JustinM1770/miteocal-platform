import { firebaseListo } from "./firebase";
import { registrar } from "./datos";
import { actualizar, crear, leer } from "./almacen";
import { aSlug, fijarEscuelas } from "./config";

/* ─── Escuelas ──────────────────────────────────────────────
   municipios/{id}/escuelas/{slug}. La app las muestra en «Escuelas»
   (Figma 16): el papá sigue los planteles de sus hijos y recibe solo sus
   avisos. `seguidores` lo mantiene una Cloud Function a partir de
   usuarios/{uid}.escuelas[]. Los avisos se publican en el módulo Escuelas.
   ───────────────────────────────────────────────────────── */

export const NIVELES = ["Preescolar", "Primaria", "Secundaria", "Bachillerato", "Universidad", "Educación especial"] as const;
export const TURNOS = ["Matutino", "Vespertino", "Tiempo completo", "Nocturno"] as const;
export type Nivel = (typeof NIVELES)[number];

export interface Escuela {
  id?: string;
  nombre: string;
  nivel: Nivel;
  /** «Bachillerato tecnológico», «Educación secundaria»… lo que ve el papá debajo del nombre */
  descripcion: string;
  turno: string;
  /** Clave de Centro de Trabajo (SEP) */
  cct: string;
  colonia: string;
  direccion: string;
  director: string;
  telefono: string;
  alumnos: number;
  seguidores?: number;
  lat?: number;
  lng?: number;
  activa: boolean;
}

const e = (nombre: string, nivel: Nivel, descripcion: string, x: Partial<Escuela>): Escuela => ({
  id: aSlug(nombre), nombre, nivel, descripcion, turno: "Matutino", cct: "", colonia: "", direccion: "", director: "", telefono: "", alumnos: 0, activa: true, ...x,
});

const demoEscuelas: Escuela[] = firebaseListo ? [] : [
  e("CBTIS 247", "Bachillerato", "Bachillerato tecnológico", { cct: "14DCT0247X", colonia: "San Miguel Norte", director: "Mtra. Patricia Ruiz", telefono: "346 787 0247", alumnos: 640, seguidores: 212, turno: "Matutino", lat: 21.4318, lng: -102.5728 }),
  e("Secundaria Federal 20", "Secundaria", "Educación secundaria", { cct: "14DES0020L", colonia: "Teocaltiche Centro", director: "Prof. Arturo Delgado", telefono: "346 787 0120", alumnos: 510, seguidores: 168, lat: 21.4262, lng: -102.5781 }),
  e("Primaria Benito Juárez", "Primaria", "Educación primaria", { cct: "14EPR0412K", colonia: "Teocaltiche Centro", director: "Mtra. Elena Torres", alumnos: 380, seguidores: 141, lat: 21.4281, lng: -102.5752 }),
  e("Primaria Rafael Ramírez", "Primaria", "Educación primaria", { cct: "14EPR0418E", colonia: "El Tanque", director: "Prof. Ramón Aguilar", alumnos: 290, seguidores: 97, turno: "Vespertino" }),
  e("Jardín de Niños Rosaura Zapata", "Preescolar", "Preescolar", { cct: "14EJN0105Z", colonia: "Bellavista", director: "Educ. Laura Muñoz", alumnos: 120, seguidores: 74 }),
  e("Jardín de Niños Tepochcalli", "Preescolar", "Preescolar", { cct: "14EJN0233R", colonia: "San Miguel Sur", alumnos: 95, seguidores: 41 }),
];

export async function listarEscuelas(): Promise<Escuela[]> {
  const l = (await leer("escuelas", demoEscuelas)).sort((a, b) => NIVELES.indexOf(a.nivel) - NIVELES.indexOf(b.nivel) || a.nombre.localeCompare(b.nombre));
  // Los avisos escolares eligen de esta lista
  fijarEscuelas(l.filter((x) => x.activa).map((x) => x.nombre));
  return l;
}

export async function guardarEscuela(x: Escuela, autor: string) {
  if (x.id) {
    await actualizar("escuelas", demoEscuelas, x.id, x);
    await registrar("Editó escuela", x.nombre, "publico", autor);
  } else {
    await crear("escuelas", demoEscuelas, x, aSlug(x.nombre));
    await registrar("Agregó escuela", `${x.nombre} · ${x.nivel}`, "publico", autor);
  }
  await listarEscuelas();
}
