import { doc, getDoc, getDocs, query, setDoc, serverTimestamp, where } from "firebase/firestore";
import { coleccion, db, documento, firebaseListo, municipioId } from "./firebase";
import { MUNICIPIO_DEMO } from "./demo-municipio";

/* ─── Configuración del municipio ───────────────────────────
   Todo lo que cambia de un municipio a otro vive en Firestore, no en el
   código (regla 2 de docs/arquitectura-multimunicipio.md):

     municipios/{id}                 nombre, estado, modulos, tema
     municipios/{id}/config/colonias     { lista: Colonia[] }
     municipios/{id}/config/emergencias  { lista: Emergencia[] }
     municipios/{id}/config/feria        { nombre, inicio, fin }
     municipios/{id}/config/catalogos    { escenarios, escuelas, templos, dependencias }
     municipios/{id}/config/estadisticas { vecinosPorColonia, total }  ← la mantiene una Cloud Function

   `colonias` y `emergencias` usan el mismo formato que el importador CSV
   del admin_panel, así se pueden cargar desde ahí o desde este panel.
   ───────────────────────────────────────────────────────── */

export const TIPOS_COLONIA = ["Barrio tradicional", "Colonia", "Fraccionamiento", "Localidad"] as const;
export type TipoColonia = (typeof TIPOS_COLONIA)[number];
export interface Colonia { id: string; nombre: string; zona?: string; tipo?: TipoColonia; lat?: number; lng?: number; horario?: string; pozo?: string }
export interface Emergencia { id: string; nombre: string; telefono: string; categoria?: string; nota?: string }
export interface Feria { nombre: string; inicio: string; fin: string }
export interface Catalogos { escenarios: string[]; escuelas: string[]; templos: string[]; dependencias: string[] }
/** Ley seca: mientras esté activa, la app oculta la venta de alcohol */
export interface LeySeca { activa: boolean; motivo: string; desde: string; hasta: string }

export type Modulo = "agua" | "basura" | "reportes" | "comercio" | "noticias" | "escuelas" | "feria" | "paisanos" | "tramites";

export interface ConfigMunicipio {
  nombre: string;
  estado: string;
  modulos: Partial<Record<Modulo, boolean>>;
  colonias: Colonia[];
  emergencias: Emergencia[];
  feria: Feria;
  catalogos: Catalogos;
  leySeca: LeySeca;
  /** nombres de las escuelas activas (colección escuelas/), para los avisos escolares */
  escuelas: string[];
  /** null mientras no exista config/estadisticas: el panel no inventa números */
  vecinosPorColonia: Record<string, number> | null;
  /** qué documentos de config faltan en Firestore, para avisar al administrador */
  faltantes: string[];
}

const VACIA: ConfigMunicipio = {
  nombre: "", estado: "", modulos: {}, colonias: [], emergencias: [],
  feria: { nombre: "Feria", inicio: "", fin: "" },
  catalogos: { escenarios: [], escuelas: [], templos: [], dependencias: [] },
  leySeca: { activa: false, motivo: "", desde: "", hasta: "" },
  escuelas: [], vecinosPorColonia: null, faltantes: [],
};

let actual: ConfigMunicipio = firebaseListo ? VACIA : MUNICIPIO_DEMO;

export const cfg = () => actual;
export function fijarEscuelas(nombres: string[]) { actual = { ...actual, escuelas: nombres }; }
export const colonias = () => actual.colonias;
/** Zonas en el orden en que aparecen en la lista de colonias; «Sin zona» si no tienen */
export const zonas = () => [...new Set(actual.colonias.map((c) => c.zona || "Sin zona"))];
export const coloniasDeZona = (z: string) => actual.colonias.filter((c) => (c.zona || "Sin zona") === z);
/** Un módulo apagado no se muestra (regla 5). Si el municipio no lo declara, se asume encendido. */
export const moduloActivo = (m: Modulo) => actual.modulos[m] !== false;

/** Vecinos con la app en una colonia (o en todo el municipio). null = no se sabe todavía. */
export function alcanceDe(colonia: string | null): number | null {
  const v = actual.vecinosPorColonia;
  if (!v) return null;
  if (!colonia) return Object.values(v).reduce((s, n) => s + n, 0);
  return v[colonia] ?? 0;
}

/** Texto para «le llega a …» que no inventa cifras cuando no hay estadísticas */
export function textoAlcance(colonia: string | null): string {
  const n = alcanceDe(colonia);
  const quien = colonia ? `los vecinos de ${colonia}` : "todos los vecinos del municipio";
  return n === null ? quien : `${n.toLocaleString("es-MX")} vecino${n === 1 ? "" : "s"} (${quien})`;
}

const DOCS = ["colonias", "emergencias", "feria", "catalogos", "estadisticas", "leySeca"] as const;

export async function cargarConfig(): Promise<ConfigMunicipio> {
  if (!firebaseListo || !db) return actual;
  const [raiz, escuelas, ...partes] = await Promise.all([
    getDoc(doc(db, "municipios", municipioId())),
    getDocs(query(coleccion("escuelas"), where("activa", "==", true))).catch(() => null),
    ...DOCS.map((d) => getDoc(documento("config", d))),
  ]);
  const m = raiz.data() ?? {};
  const [col, eme, fer, cat, est, ley] = partes.map((p) => p.data());
  actual = {
    nombre: m.nombre ?? municipioId(),
    estado: m.estado ?? "",
    modulos: m.modulos ?? {},
    colonias: (col?.lista ?? []) as Colonia[],
    emergencias: (eme?.lista ?? []) as Emergencia[],
    feria: { ...VACIA.feria, ...(fer ?? {}) } as Feria,
    catalogos: { ...VACIA.catalogos, ...(cat ?? {}) } as Catalogos,
    escuelas: escuelas ? escuelas.docs.map((d) => d.get("nombre") as string).sort() : (cat?.escuelas ?? []),
    leySeca: { ...VACIA.leySeca, ...(ley ?? {}) } as LeySeca,
    vecinosPorColonia: est?.vecinosPorColonia ?? null,
    faltantes: DOCS.filter((d, i) => d !== "estadisticas" && d !== "leySeca" && !partes[i].exists()),
  };
  return actual;
}

/** Guarda una parte de la configuración (solo funcionarios; lo valida la regla) */
export async function guardarConfig<K extends "colonias" | "emergencias" | "feria" | "catalogos" | "leySeca">(
  parte: K, valor: K extends "colonias" ? Colonia[] : K extends "emergencias" ? Emergencia[] : K extends "feria" ? Feria : K extends "leySeca" ? LeySeca : Catalogos,
) {
  const datos = parte === "colonias" || parte === "emergencias" ? { lista: valor } : valor;
  if (firebaseListo && db) await setDoc(documento("config", parte), { ...datos, actualizadoEn: serverTimestamp() });
  actual = { ...actual, [parte]: valor, faltantes: actual.faltantes.filter((f) => f !== parte) };
}

/** Id estable a partir de un nombre: «San Miguel Norte» → san-miguel-norte */
export const aSlug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
