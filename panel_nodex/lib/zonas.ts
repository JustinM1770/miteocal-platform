import { f, type Fecha } from "./almacen";
import type { Punto } from "./mapas";
import type { EstadoReporte, TipoReporte } from "./datos";

/* Zonas críticas y métricas de impacto de los reportes ciudadanos.
   Pura estadística (conteos, promedios, desviación estándar), sin IA:
   cualquiera puede revisar a mano por qué una colonia salió «crítica». */

/** Lo mínimo de un reporte que necesitan estas cuentas */
export interface ReporteZona {
  tipo: TipoReporte;
  colonia: string;
  lat: number | null;
  lng: number | null;
  estado: EstadoReporte;
  historial: { estado: EstadoReporte; fecha: Fecha }[];
  creadoEn: Fecha;
}

export interface ColoniaUbicada { nombre: string; lat?: number; lng?: number }

const DIA = 86_400_000;
const HORA = 3_600_000;

/** Lunes 00:00 (hora local) de la semana de `d` */
export function inicioSemana(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** Reportes creados en las últimas `semanas` semanas completas, contando la actual */
export function enPeriodo<T extends ReporteZona>(reportes: T[], semanas: number, hoy = new Date()): T[] {
  const desde = +inicioSemana(hoy) - (semanas - 1) * 7 * DIA;
  return reportes.filter((r) => +f(r.creadoEn) >= desde);
}

export interface Semana { inicio: Date; total: number; resueltos: number }

/** Reportes por semana, de la más vieja a la actual; las semanas sin reportes salen en 0 */
export function tendenciaSemanal(reportes: ReporteZona[], semanas: number, hoy = new Date()): Semana[] {
  const actual = inicioSemana(hoy);
  const lista: Semana[] = Array.from({ length: semanas }, (_, i) => {
    const inicio = new Date(actual);
    inicio.setDate(inicio.getDate() - (semanas - 1 - i) * 7);
    return { inicio, total: 0, resueltos: 0 };
  });
  for (const r of reportes) {
    const k = +inicioSemana(f(r.creadoEn));
    const s = lista.find((x) => +x.inicio === k);
    if (!s) continue;
    s.total++;
    if (r.estado === "resuelto") s.resueltos++;
  }
  return lista;
}

/** Cambio porcentual de b a a; null si no hay base para comparar */
export function variacion(a: number, b: number): number | null {
  return b ? Math.round(((a - b) / b) * 100) : null;
}

export interface ResumenColonia {
  colonia: string;
  total: number;
  pendientes: number;
  resueltos: number;
  /** tipo de reporte más frecuente en la colonia */
  tipoPrincipal: TipoReporte;
  /** reportes de las 2 semanas más recientes contra las 2 anteriores */
  recientes: number;
  previos: number;
  /** desviaciones estándar sobre el promedio de colonias con reportes */
  z: number;
  critica: boolean;
  punto: Punto | null;
}

/** Una colonia es crítica si está 1 desviación estándar arriba del promedio */
export const UMBRAL_CRITICA = 1;

export function porColonia(reportes: ReporteZona[], colonias: ColoniaUbicada[], hoy = new Date()): ResumenColonia[] {
  const grupos = new Map<string, ReporteZona[]>();
  for (const r of reportes) {
    const k = r.colonia.trim() || "Sin colonia";
    grupos.set(k, [...(grupos.get(k) ?? []), r]);
  }
  const conteos = [...grupos.values()].map((l) => l.length);
  const media = conteos.reduce((s, n) => s + n, 0) / (conteos.length || 1);
  const desv = Math.sqrt(conteos.reduce((s, n) => s + (n - media) ** 2, 0) / (conteos.length || 1));
  const corte = +inicioSemana(hoy) - 7 * DIA;   // inicio de la semana pasada

  return [...grupos.entries()].map(([colonia, l]) => {
    const tipos = new Map<TipoReporte, number>();
    l.forEach((r) => tipos.set(r.tipo, (tipos.get(r.tipo) ?? 0) + 1));
    const tipoPrincipal = [...tipos.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const z = desv ? (l.length - media) / desv : 0;
    return {
      colonia, total: l.length, tipoPrincipal,
      pendientes: l.filter((r) => r.estado !== "resuelto").length,
      resueltos: l.filter((r) => r.estado === "resuelto").length,
      recientes: l.filter((r) => +f(r.creadoEn) >= corte).length,
      previos: l.filter((r) => +f(r.creadoEn) < corte && +f(r.creadoEn) >= corte - 14 * DIA).length,
      z: Math.round(z * 10) / 10,
      critica: z >= UMBRAL_CRITICA,
      punto: centroDe(colonia, l, colonias),
    };
  }).sort((a, b) => b.total - a.total || b.pendientes - a.pendientes);
}

/** Centro de la colonia en el mapa: el de config/colonias o, si no tiene, el promedio de sus reportes con GPS */
function centroDe(colonia: string, l: ReporteZona[], colonias: ColoniaUbicada[]): Punto | null {
  const c = colonias.find((x) => x.nombre === colonia);
  if (typeof c?.lat === "number" && typeof c?.lng === "number") return { lng: c.lng, lat: c.lat };
  const gps = l.filter((r) => r.lat !== null && r.lng !== null);
  if (!gps.length) return null;
  return { lng: gps.reduce((s, r) => s + r.lng!, 0) / gps.length, lat: gps.reduce((s, r) => s + r.lat!, 0) / gps.length };
}

/** Puntos del mapa de calor: el GPS del reporte o, sin él, el centro de su colonia.
    Lo pendiente pesa el doble que lo resuelto: el mapa muestra dónde duele hoy. */
export function puntosDeCalor(reportes: ReporteZona[], colonias: ResumenColonia[]): { punto: Punto; peso: number }[] {
  const centro = new Map(colonias.map((c) => [c.colonia, c.punto]));
  return reportes.flatMap((r) => {
    const punto = r.lat !== null && r.lng !== null ? { lng: r.lng, lat: r.lat } : centro.get(r.colonia.trim() || "Sin colonia");
    return punto ? [{ punto, peso: r.estado === "resuelto" ? 1 : 2 }] : [];
  });
}

export interface Impacto {
  total: number;
  atendidos: number;
  /** % de reportes resueltos */
  tasaAtencion: number;
  /** horas de que llega el reporte a la primera respuesta del Ayuntamiento */
  respuestaPromedio: number | null;
  respuestaMediana: number | null;
  /** horas de que llega el reporte a que se marca resuelto */
  resolucionPromedio: number | null;
  /** reportes sin ninguna respuesta con más de 48 horas */
  sinRespuesta48: number;
}

export function impacto(reportes: ReporteZona[], ahora = new Date()): Impacto {
  const horas = (r: ReporteZona, filtro: (e: { estado: EstadoReporte }) => boolean) => {
    const e = r.historial.filter(filtro).map((h) => +f(h.fecha)).sort((a, b) => a - b)[0];
    return e === undefined ? null : Math.max(0, (e - +f(r.creadoEn)) / HORA);
  };
  const respuestas = reportes.map((r) => horas(r, () => true)).filter((h): h is number => h !== null);
  const resoluciones = reportes.map((r) => horas(r, (e) => e.estado === "resuelto")).filter((h): h is number => h !== null);
  const atendidos = reportes.filter((r) => r.estado === "resuelto").length;
  return {
    total: reportes.length,
    atendidos,
    tasaAtencion: reportes.length ? Math.round((atendidos / reportes.length) * 100) : 0,
    respuestaPromedio: promedio(respuestas),
    respuestaMediana: mediana(respuestas),
    resolucionPromedio: promedio(resoluciones),
    sinRespuesta48: reportes.filter((r) => !r.historial.length && r.estado !== "resuelto" && +ahora - +f(r.creadoEn) > 48 * HORA).length,
  };
}

const promedio = (l: number[]) => (l.length ? l.reduce((s, n) => s + n, 0) / l.length : null);
function mediana(l: number[]): number | null {
  if (!l.length) return null;
  const o = [...l].sort((a, b) => a - b), m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

/** 5 h · 1.5 días */
export function duracion(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${(h / 24).toFixed(1).replace(/\.0$/, "")} días`;
}

/* ─── Datos externos (CSV) ──────────────────────────────────
   Para analizar con estas mismas cuentas un archivo que no viene de la app
   (p. ej. los datos del reto del hackathon). Se leen en el navegador y no se
   guardan: solo se cuentan. Los encabezados se reconocen por sinónimos porque
   cada dependencia nombra distinto sus columnas. */

const SINONIMOS: Record<"colonia" | "tipo" | "estado" | "fecha" | "lat" | "lng" | "respuesta" | "cierre", string[]> = {
  colonia: ["colonia", "barrio", "asentamiento", "localidad", "sector", "zona"],
  tipo: ["tipo", "categoria", "problema", "servicio", "motivo", "asunto"],
  estado: ["estado", "estatus", "status", "situacion"],
  fecha: ["fecha", "fecha reporte", "fecha de reporte", "fecha alta", "creado", "creado en", "fecha recepcion", "fecha de recepcion"],
  lat: ["lat", "latitud", "latitude", "y"],
  lng: ["lng", "lon", "long", "longitud", "longitude", "x"],
  respuesta: ["fecha respuesta", "fecha de respuesta", "fecha atencion", "fecha de atencion", "primera respuesta"],
  cierre: ["fecha cierre", "fecha de cierre", "fecha solucion", "fecha de solucion", "resuelto en", "fecha resolucion"],
};

const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();

/** Del texto libre de una dependencia al tipo de reporte de la app */
export function tipoDeTexto(s: string): TipoReporte {
  const t = normal(s);
  if (/bache|pavimento|calle|hundimiento/.test(t)) return "bache";
  if (/fuga|agua|tuberia|toma/.test(t)) return "fuga";
  if (/drenaje|alcantarill|coladera|aguas negras|registro/.test(t)) return "drenaje";
  if (/basura|recoleccion|residuo|tiradero/.test(t)) return "basura";
  if (/lumin|alumbrado|lampara|foco|poste/.test(t)) return "luminaria";
  return "otro";
}

export function estadoDeTexto(s: string): EstadoReporte {
  const t = normal(s);
  if (/resuel|atendid|cerrad|conclu|termin|solucion|finaliz/.test(t)) return "resuelto";
  if (/proceso|curso|asignad|revision|programad/.test(t)) return "en_proceso";
  return "recibido";
}

/** ISO (2026-11-03, con o sin hora) o dd/mm/aaaa [hh:mm] */
export function fechaDeTexto(s: string): Date | null {
  const t = s.trim();
  const dmy = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (dmy) {
    const [, d, m, a, h = "12", mi = "00"] = dmy;
    const x = new Date(+(a.length === 2 ? `20${a}` : a), +m - 1, +d, +h, +mi);
    return isNaN(+x) ? null : x;
  }
  const x = new Date(/^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T12:00` : t);
  return t && !isNaN(+x) ? x : null;
}

export interface LecturaExterna {
  reportes: ReporteZona[];
  /** columna del archivo que se usó para cada dato */
  columnas: Partial<Record<keyof typeof SINONIMOS, string>>;
  ignoradas: string[];
  /** renglones descartados (sin fecha válida), con su número en el archivo */
  descartados: number[];
  error: string | null;
}

/** `filas` viene de leerCSV: la primera es de encabezados */
export function reportesDeCSV(filas: string[][]): LecturaExterna {
  const vacia: LecturaExterna = { reportes: [], columnas: {}, ignoradas: [], descartados: [], error: null };
  if (filas.length < 2) return { ...vacia, error: "El archivo no tiene renglones de datos." };
  const enc = filas[0].map(normal);
  const columnas: LecturaExterna["columnas"] = {};
  const indice: Partial<Record<keyof typeof SINONIMOS, number>> = {};
  for (const k of Object.keys(SINONIMOS) as (keyof typeof SINONIMOS)[]) {
    const i = enc.findIndex((e, j) => SINONIMOS[k].includes(e) && !Object.values(indice).includes(j));
    if (i >= 0) { indice[k] = i; columnas[k] = filas[0][i]; }
  }
  if (indice.fecha === undefined) return { ...vacia, columnas, error: "Falta una columna de fecha (fecha, fecha_reporte, creado…)." };
  if (indice.colonia === undefined && indice.lat === undefined) return { ...vacia, columnas, error: "Falta la colonia o las coordenadas: sin ellas no se puede ubicar nada." };

  const usadas = new Set(Object.values(indice));
  const descartados: number[] = [];
  const reportes: ReporteZona[] = [];
  const celda = (f: string[], k: keyof typeof SINONIMOS) => (indice[k] === undefined ? "" : f[indice[k]!] ?? "");
  const numero = (s: string) => { const n = parseFloat(s.replace(",", ".")); return s.trim() && !isNaN(n) ? n : null; };

  filas.slice(1).forEach((f, i) => {
    const creado = fechaDeTexto(celda(f, "fecha"));
    if (!creado) { descartados.push(i + 2); return; }
    let estado = estadoDeTexto(celda(f, "estado"));
    const respuesta = fechaDeTexto(celda(f, "respuesta")), cierre = fechaDeTexto(celda(f, "cierre"));
    if (cierre && indice.estado === undefined) estado = "resuelto";
    const historial: ReporteZona["historial"] = [
      ...(respuesta ? [{ estado: "en_proceso" as const, fecha: respuesta }] : []),
      ...(cierre ? [{ estado: "resuelto" as const, fecha: cierre }] : []),
    ];
    const lat = numero(celda(f, "lat")), lng = numero(celda(f, "lng"));
    reportes.push({
      tipo: tipoDeTexto(celda(f, "tipo")), colonia: celda(f, "colonia").trim(), estado, historial, creadoEn: creado,
      lat: lat !== null && lng !== null ? lat : null, lng: lat !== null && lng !== null ? lng : null,
    });
  });
  return { reportes, columnas, descartados, ignoradas: filas[0].filter((_, i) => !usadas.has(i)), error: null };
}

/** Fecha más reciente de los reportes: con datos viejos, las semanas se cuentan hacia atrás desde ahí */
export function ultimaFecha(reportes: ReporteZona[]): Date {
  return reportes.length ? new Date(Math.max(...reportes.map((r) => +f(r.creadoEn)))) : new Date();
}
