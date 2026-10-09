import {
  getDocs, query, where, orderBy, limit, serverTimestamp, Timestamp, doc, writeBatch,
  arrayUnion, GeoPoint, getCountFromServer, collection, addDoc, getDoc,
} from "firebase/firestore";
import { coleccion, db, documento, firebaseListo, municipioId } from "./firebase";
import { alcanceDe } from "./config";
import { diaLocal, f } from "./almacen";
import { deJSON } from "./mapas";

/* ─── Modelo ────────────────────────────────────────────────
   municipios/{id}/publicaciones es el HISTORIAL inmutable de todo lo que
   el panel publica (agua, cortes, avisos, esquelas…). Nada se edita ni se
   borra: una corrección es una publicación nueva.

   Lo que la app ya lee en su propio formato recibe además un ESPEJO en
   la misma escritura atómica (ver docs/arquitectura-multimunicipio.md §2):
     agua      → agua/{AAAA-MM-DD}   (todo el municipio, o colonias.{colonia})
     incidente → agua/{AAAA-MM-DD}.incidencias[]
     noticia   → noticias/{id}
     cierre    → obras/{id}
   ───────────────────────────────────────────────────────── */

export type Estado = "activo" | "sin_servicio" | "sin_dato";
export type Canal = "publico" | "interno";
export type Tipo =
  | "agua" | "corte" | "incidente" | "basura" | "cierre" | "escuela"
  | "noticia" | "parroquia" | "esquela"
  | "vacante" | "clasificado" | "paisanos"
  | "aviso_interno" | "dependencia";

export interface Publicacion {
  id?: string;
  municipioId?: string;
  tipo: Tipo;
  canal: Canal;
  colonia: string | null;
  estado: Estado | null;
  titulo: string;
  mensaje: string;
  horaEstimada: string | null;
  /** cuándo debe hacerse visible en la app (programación) */
  publicarEn: Timestamp | Date;
  /** a partir de aquí la app muestra «sin información actualizada» */
  caducaEn: Timestamp | Date | null;
  notificar: boolean;
  /** vecinos a los que llega; null si todavía no hay estadísticas */
  alcance: number | null;
  autorNombre: string;
  autorUid: string;
  creadoEn: Timestamp | Date;
  /** campos propios de cada módulo (escenario, escuela, teléfono…), ver lib/modulos.ts */
  datos?: Record<string, string>;
}

/** Datos del servicio de agua que muestra la tarjeta de Inicio de la app */
export interface DetalleAgua { horario: string; presion: number | null; calidad: string; cobertura: string }

export interface Auditoria {
  id?: string;
  accion: string;
  detalle: string;
  canal: Canal;
  autorNombre: string;
  creadoEn: Timestamp | Date;
}

export const MENSAJES_RAPIDOS = [
  "Falla en el pozo. La cuadrilla ya está trabajando en la reparación.",
  "Mantenimiento programado de la red.",
  "Baja presión por alta demanda. El servicio sigue activo.",
  "El servicio quedó restablecido.",
];

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  activo: "Servicio activo",
  sin_servicio: "Sin servicio",
  sin_dato: "Sin dato del pozo",
};

/** Cómo lo guarda la app en agua/{fecha}.estado */
const ESTADO_APP: Record<Estado, string> = { activo: "activo", sin_servicio: "sin-servicio", sin_dato: "sin-dato" };

export function aFecha(v: Timestamp | Date | null | undefined): Date | null {
  if (!v) return null;
  return v instanceof Date ? v : v.toDate();
}

export const yaPublicada = (p: Publicacion) => +f(p.publicarEn) <= Date.now();

/* ─── Almacén en memoria para modo demo ─────────────────── */
const demo: { pubs: Publicacion[]; audit: Auditoria[] } = { pubs: [], audit: [] };

function hace(horas: number) {
  return new Date(Date.now() - horas * 3600_000);
}

function semillaBase(): { pubs: Publicacion[]; audit: Auditoria[] } {
  return {
    pubs: [
      {
        tipo: "agua", canal: "publico", colonia: "Teocaltiche Centro",
        estado: "sin_servicio", titulo: "Agua · Teocaltiche Centro",
        mensaje: "Falla en el pozo. La cuadrilla ya está trabajando en la reparación.",
        horaEstimada: "16:00", publicarEn: hace(14), caducaEn: hace(-10), notificar: true,
        alcance: 184, autorNombre: "Laura M.", autorUid: "demo", creadoEn: hace(14),
      },
      {
        tipo: "corte", canal: "publico", colonia: "Teocaltiche Centro",
        estado: null, titulo: "Mantenimiento de red · Teocaltiche Centro",
        mensaje: "De 8:00 a 14:00 hrs por cambio de tubería.",
        horaEstimada: null, publicarEn: hace(26), caducaEn: null, notificar: false,
        alcance: 184, autorNombre: "Jorge R.", autorUid: "demo", creadoEn: hace(26),
        datos: { fecha: diaLocal(hace(-48)), horario: "8:00 a 14:00 hrs" },
      },
    ],
    audit: [
      { accion: "Publicó estado de agua", detalle: "Teocaltiche Centro · Sin servicio", canal: "publico", autorNombre: "Laura M.", creadoEn: hace(14) },
      { accion: "Encoló notificación", detalle: "184 vecinos de Teocaltiche Centro", canal: "publico", autorNombre: "Laura M.", creadoEn: hace(14) },
      { accion: "Programó corte", detalle: "Teocaltiche Centro", canal: "publico", autorNombre: "Jorge R.", creadoEn: hace(26) },
      { accion: "Publicó aviso interno", detalle: "Junta de dependencias del viernes", canal: "interno", autorNombre: "Admin", creadoEn: hace(30) },
    ],
  };
}

function semillaModulos(): Publicacion[] {
  const base = { canal: "publico" as Canal, estado: null, horaEstimada: null, caducaEn: null, notificar: false, autorUid: "demo" };
  const pub = (tipo: Tipo, h: number, autor: string, titulo: string, mensaje: string, colonia: string | null, datos: Record<string, string> = {}, extra: Partial<Publicacion> = {}): Publicacion => ({
    ...base, tipo, titulo, mensaje, colonia, datos, autorNombre: autor,
    alcance: alcanceDe(colonia), publicarEn: hace(h), creadoEn: hace(h), ...extra,
  });
  return [
    pub("incidente", 14, "Laura M.", "Reporte recibido", "Vecinos de Teocaltiche Centro reportan falta de agua.", "Teocaltiche Centro", { hora: "09:20" }),
    pub("incidente", 13, "Laura M.", "Diagnóstico", "Falla confirmada en la bomba sumergible del pozo.", "Teocaltiche Centro", { hora: "10:05" }),
    pub("incidente", 12, "Laura M.", "Cuadrilla en sitio", "Personal de SAPAS trabajando en la reparación.", "Teocaltiche Centro", { hora: "11:40" }),
    pub("cierre", 20, "Obras Públicas", "Calle Zaragoza", "Entre Juárez e Hidalgo, por rehabilitación de pavimento.", "Teocaltiche Centro", { categoria: "Cierre total", lugar: "Zaragoza entre Juárez e Hidalgo", fecha: "2026-10-01", hasta: "2026-10-22", ruta: "Por Morelos" }),
    pub("cierre", 30, "Obras Públicas", "Rehabilitación de calle 2 de Abril inicia el lunes", "Un carril cerrado en dirección norte, de 8:00 a 18:00 hrs.", "Teocaltiche Centro", { categoria: "Obra", lugar: "Calle 2 de Abril", fecha: "2026-10-12", hasta: "2026-11-05", ruta: "Por Hidalgo y Morelos" }),
    pub("escuela", 5, "Educación", "Suspensión de clases · CBTIS 247", "Viernes 16: no hay clases por junta de consejo técnico escolar. Se reanudan el lunes 19.", null, { escuela: "CBTIS 247", categoria: "Suspensión de clases", fecha: "2026-10-16" }),
    pub("escuela", 26, "Educación", "Aviso · Secundaria Federal 20", "Entrega de boletas el lunes 19, de 9:00 a 13:00 hrs en cada aula. Asistencia de padres obligatoria.", null, { escuela: "Secundaria Federal 20", categoria: "Aviso", fecha: "2026-10-19" }),
    pub("noticia", 2, "Comunicación", "Rehabilitación de calle Benito Juárez inicia el lunes", "Habrá desvíos por Hidalgo y Morelos durante tres semanas.", null, { categoria: "Obras" }),
    pub("noticia", 5, "Comunicación", "Campaña de vacunación en el Centro de Salud", "Del 7 al 11 de octubre, de 9:00 a 14:00 hrs. Lleva tu cartilla.", null, { categoria: "Salud" }),
    pub("parroquia", 20, "Parroquia", "Misa dominical", "Misa dominical a las 7:00 hrs.", null, { templo: "Parroquia de San Miguel Arcángel", fecha: "2026-10-05", hora: "07:00" }),
    pub("esquela", 4, "Comunicación", "Ma. de Jesús Torres Villanueva", "Misa de cuerpo presente hoy a las 18:00 hrs.", null, { lugar: "Templo de El Señor de Las Maravillas", fallecio: "2026-10-03", fecha: "2026-10-04", hora: "18:00" }),
    pub("vacante", 26, "Desarrollo Económico", "Secretaria bilingüe", "Inglés intermedio, manejo de Office. Lunes a viernes.", null, { negocio: "Notaría Pública No. 4", categoria: "Tiempo completo", salario: "$9,000 / mes", contacto: "346 787 0000" }),
    pub("clasificado", 50, "Desarrollo Económico", "Nissan Versa 2019 en buen estado", "60 mil km, factura original.", null, { categoria: "Vehículo", precio: "$145,000", contacto: "346 100 2030" }),
    pub("paisanos", 72, "Atención a Migrantes", "Pago de predial desde el extranjero", "Paga el predial de tu casa desde EE. UU. con tarjeta.", null, { categoria: "Predial" }),
    pub("aviso_interno", 30, "Admin", "Junta de dependencias del viernes", "Viernes 10:00 hrs en sala de Cabildo. Traer avance de reportes.", null, { area: "Todas", prioridad: "Normal" }, { canal: "interno" }),
    pub("dependencia", 200, "Admin", "Obras Públicas", "Ing. Ramírez · ext. 114", null, { telefono: "346 787 0114", area: "Obras Públicas" }, { canal: "interno" }),
  ];
}

if (!firebaseListo) {
  const b = semillaBase();
  demo.pubs = [...b.pubs, ...semillaModulos()];
  demo.audit = b.audit;
}

const porFecha = <T extends { creadoEn: Timestamp | Date }>(a: T, b: T) => +f(b.creadoEn) - +f(a.creadoEn);

/* ─── Lecturas ──────────────────────────────────────────── */

/** La publicación vigente: la más reciente que YA salió (las programadas no cuentan) */
export async function ultimaDeTipo(tipo: Tipo, colonia?: string): Promise<Publicacion | null> {
  const l = await publicacionesDeTipo(tipo, 10, colonia);
  return l.find(yaPublicada) ?? null;
}

export async function publicacionesDeTipo(tipo: Tipo, n = 20, colonia?: string): Promise<Publicacion[]> {
  if (!firebaseListo || !db) {
    return demo.pubs.filter((p) => p.tipo === tipo && (!colonia || p.colonia === colonia)).sort(porFecha).slice(0, n);
  }
  const filtros = [where("tipo", "==", tipo)];
  if (colonia) filtros.push(where("colonia", "==", colonia));
  const snap = await getDocs(query(coleccion("publicaciones"), ...filtros, orderBy("creadoEn", "desc"), limit(n)));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Publicacion));
}

/** Lo que la app está mostrando hoy en la tarjeta de agua: municipios/{id}/agua/{hoy} */
export async function aguaDeHoy(): Promise<(Partial<DetalleAgua> & { estado?: string; colonias?: Record<string, { estado: string }> }) | null> {
  if (!firebaseListo || !db) return { horario: "6:00 – 14:00 hrs", presion: 1.8, calidad: "Potable", cobertura: "Parcial" };
  const d = await getDoc(documento("agua", diaLocal()));
  return d.exists() ? d.data() : null;
}

/** Publicaciones programadas que todavía no salen (de cualquier tipo) */
export async function programadas(n = 10): Promise<Publicacion[]> {
  if (!firebaseListo || !db) return demo.pubs.filter((p) => !yaPublicada(p)).slice(0, n);
  const snap = await getDocs(query(coleccion("publicaciones"), where("publicarEn", ">", Timestamp.now()), orderBy("publicarEn"), limit(n)));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Publicacion));
}

export async function actividadReciente(n = 6): Promise<Auditoria[]> {
  if (!firebaseListo || !db) return [...demo.audit].sort(porFecha).slice(0, n);
  const snap = await getDocs(query(coleccion("auditoria"), orderBy("creadoEn", "desc"), limit(n)));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Auditoria));
}

export async function metricas() {
  const desde = new Date(Date.now() - 7 * 86400_000);
  if (!firebaseListo || !db) {
    const sem = demo.pubs.filter((p) => +f(p.creadoEn) > +desde);
    return { vecinos: alcanceDe(null), publicaciones: sem.length, notificaciones: sem.filter((p) => p.notificar).length };
  }
  const ts = Timestamp.fromDate(desde);
  const [pubs, avisos] = await Promise.all([
    getCountFromServer(query(coleccion("publicaciones"), where("creadoEn", ">", ts))),
    getCountFromServer(query(coleccion("notificaciones"), where("creadoEn", ">", ts))),
  ]);
  return { vecinos: alcanceDe(null), publicaciones: pubs.data().count, notificaciones: avisos.data().count };
}

/* ─── Escrituras ────────────────────────────────────────── */

export interface OpcionesPublicar {
  accion?: string;
  /** detalle del servicio para agua/{fecha} (solo tipo agua) */
  agua?: DetalleAgua;
  /** texto de la notificación, si es distinto del título y mensaje */
  push?: { titulo: string; cuerpo: string };
  /** a qué colonias va la notificación si no es solo `colonia` (p. ej. las de una ruta de basura) */
  colonias?: string[];
}

/**
 * Publica en una sola escritura atómica: historial + espejo para la app +
 * bitácora + notificación en cola. Si algo falla, no se guarda nada.
 */
export async function publicar(p: Omit<Publicacion, "municipioId" | "creadoEn">, opciones: OpcionesPublicar = {}): Promise<string> {
  const accion = opciones.accion ?? "Publicó estado de agua";
  const detalle = p.tipo === "agua"
    ? `${p.colonia ?? "Todo el municipio"}${p.estado ? ` · ${ETIQUETA_ESTADO[p.estado]}` : ""}`
    : `${p.titulo}${p.colonia ? ` · ${p.colonia}` : ""}`;
  const zonaAviso = opciones.colonias?.length ? opciones.colonias.join(", ") : p.colonia ?? "todo el municipio";
  const aQuien = `${p.alcance === null ? "Vecinos" : `${p.alcance} vecinos`} de ${zonaAviso}`;

  if (!firebaseListo || !db) {
    const id = `pub-${Date.now()}`;
    demo.pubs.unshift({ ...p, id, creadoEn: new Date() } as Publicacion);
    demo.audit.unshift({ accion, detalle, canal: p.canal, autorNombre: p.autorNombre, creadoEn: new Date() });
    if (p.notificar) demo.audit.unshift({ accion: "Encoló notificación", detalle: aQuien, canal: p.canal, autorNombre: p.autorNombre, creadoEn: new Date() });
    return id;
  }

  const lote = writeBatch(db);
  const ref = doc(coleccion("publicaciones"));
  const ahora = serverTimestamp();
  lote.set(ref, { ...p, municipioId: municipioId(), creadoEn: ahora });

  const fechaAgua = diaLocal(f(p.publicarEn));
  if (p.tipo === "agua" && p.estado) {
    const estadoColonia = { estado: ESTADO_APP[p.estado], mensaje: p.mensaje, horaEstimada: p.horaEstimada, actualizadoEn: ahora, publicacionId: ref.id };
    lote.set(documento("agua", fechaAgua), p.colonia
      ? { colonias: { [p.colonia]: estadoColonia } }
      : { ...estadoColonia, ...(opciones.agua ?? {}) },
    { merge: true });
  }
  if (p.tipo === "incidente") {
    lote.set(documento("agua", fechaAgua), {
      incidencias: arrayUnion({ hora: p.datos?.hora ?? "", titulo: p.titulo, mensaje: p.mensaje, colonia: p.colonia, publicacionId: ref.id }),
    }, { merge: true });
  }
  if (p.tipo === "noticia") {
    lote.set(documento("noticias", ref.id), {
      titulo: p.titulo, cuerpo: p.mensaje, categoria: p.datos?.categoria ?? "", publicadaEn: p.publicarEn,
      fuente: p.datos?.fuente ?? "", imagen: p.datos?.imagen ?? "", colonia: p.colonia, publicacionId: ref.id,
    });
  }
  if (p.tipo === "cierre") {
    lote.set(documento("obras", ref.id), {
      titulo: p.titulo, calle: p.datos?.lugar ?? "", tipo: p.datos?.categoria ?? "", descripcion: p.mensaje,
      inicio: p.datos?.fecha ?? "", fin: p.datos?.hasta ?? "", rutaAlterna: p.datos?.ruta ?? "",
      geo: deJSON(p.datos?.trazo).map((q) => new GeoPoint(q.lat, q.lng)), colonia: p.colonia,
      publicadaEn: p.publicarEn, publicacionId: ref.id,
    });
  }

  lote.set(doc(coleccion("auditoria")), { accion, detalle, canal: p.canal, autorNombre: p.autorNombre, autorUid: p.autorUid, creadoEn: ahora });

  if (p.notificar && p.canal === "publico") {
    // El envío real lo hace una Cloud Function que escucha esta colección (backend/functions)
    lote.set(doc(coleccion("notificaciones")), {
      titulo: opciones.push?.titulo ?? p.titulo, cuerpo: opciones.push?.cuerpo ?? p.mensaje,
      colonias: opciones.colonias?.length ? opciones.colonias : p.colonia ? [p.colonia] : null, segmento: null,
      programadaPara: p.publicarEn, estado: "pendiente",
      origen: { coleccion: "publicaciones", id: ref.id }, autorUid: p.autorUid, creadoEn: ahora,
    });
    lote.set(doc(coleccion("auditoria")), { accion: "Encoló notificación", detalle: aQuien, canal: p.canal, autorNombre: p.autorNombre, autorUid: p.autorUid, creadoEn: ahora });
  }

  await lote.commit();
  return ref.id;
}

/** Segmento de vecinos para un aviso que no sale de una publicación (CRM) */
export interface Segmento { colonias: string[] | null; tipo: "local" | "paisano" | null; compradoresDe: string | null; descripcion: string }

export async function enviarAviso(titulo: string, cuerpo: string, segmento: Segmento, autorNombre: string, autorUid: string): Promise<void> {
  if (!firebaseListo || !db) {
    demo.audit.unshift({ accion: "Encoló aviso a segmento", detalle: `${titulo} · ${segmento.descripcion}`, canal: "publico", autorNombre, creadoEn: new Date() });
    return;
  }
  const lote = writeBatch(db);
  const ahora = serverTimestamp();
  lote.set(doc(coleccion("notificaciones")), {
    titulo, cuerpo, colonias: segmento.colonias, segmento, programadaPara: Timestamp.now(), estado: "pendiente",
    origen: { coleccion: "crm", id: null }, autorUid, creadoEn: ahora,
  });
  lote.set(doc(coleccion("auditoria")), { accion: "Encoló aviso a segmento", detalle: `${titulo} · ${segmento.descripcion}`, canal: "publico", autorNombre, autorUid, creadoEn: ahora });
  await lote.commit();
}

/** Horas transcurridas desde la última actualización, para el aviso de dato caducado */
export function horasDesde(v: Timestamp | Date | null | undefined): number | null {
  const d = aFecha(v);
  return d ? Math.floor((Date.now() - +d) / 3600_000) : null;
}

export function haceTexto(v: Timestamp | Date | null | undefined): string {
  const d = aFecha(v);
  if (!d) return "—";
  const h = Math.floor((Date.now() - +d) / 3600_000);
  if (h < 0) return `en ${Math.ceil(-h / 24) <= 1 ? `${-h} h` : `${Math.ceil(-h / 24)} días`}`;
  if (h < 1) return "hace unos minutos";
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}

/* ─── Reportes ciudadanos ───────────────────────────────────
   Los crea el vecino desde la app en municipios/{id}/reportes/{folio}
   con { uid, tipo, descripcion, foto, geo, estado: 'recibido', historial[] }.
   El panel los atiende: cambia el estado y agrega al historial.
   ───────────────────────────────────────────────────────── */

export type TipoReporte = "bache" | "fuga" | "drenaje" | "basura" | "luminaria" | "otro";
export type EstadoReporte = "recibido" | "en_proceso" | "resuelto";

export const ETIQUETA_REPORTE: Record<TipoReporte, string> = {
  bache: "Bache", fuga: "Fuga de agua", drenaje: "Drenaje",
  basura: "Basura", luminaria: "Luminaria", otro: "Otro",
};
export const ETIQUETA_ESTADO_REPORTE: Record<EstadoReporte, string> = {
  recibido: "Recibido", en_proceso: "En proceso", resuelto: "Resuelto",
};

export interface EventoReporte { estado: EstadoReporte; mensaje: string; autor: string; fecha: Timestamp | Date }

export interface Reporte {
  id?: string;
  folio: string;
  tipo: TipoReporte;
  colonia: string;
  direccion: string;
  descripcion: string;
  fotoUrl: string | null;
  lat: number | null;
  lng: number | null;
  estado: EstadoReporte;
  respuesta: string | null;
  vecinoNombre: string;
  telefono?: string;
  /** uid del vecino en la app; con él ve solo sus propios reportes */
  vecinoUid?: string;
  historial: EventoReporte[];
  creadoEn: Timestamp | Date;
}

/** Del documento que escribe la app al formato del panel */
function normalizarReporte(id: string, d: Record<string, unknown>): Reporte {
  const geo = d.geo as GeoPoint | undefined;
  const historial = (d.historial as EventoReporte[] | undefined) ?? [];
  const tipo = (d.tipo as string) in ETIQUETA_REPORTE ? (d.tipo as TipoReporte) : "otro";
  return {
    id, folio: (d.folio as string) ?? id, tipo,
    colonia: (d.colonia as string) ?? "", direccion: (d.direccion as string) ?? "",
    descripcion: (d.descripcion as string) ?? "", fotoUrl: (d.foto as string) ?? (d.fotoUrl as string) ?? null,
    lat: geo?.latitude ?? (d.lat as number) ?? null, lng: geo?.longitude ?? (d.lng as number) ?? null,
    estado: (d.estado as EstadoReporte) ?? "recibido",
    respuesta: (d.respuesta as string) ?? [...historial].reverse().find((h) => h.mensaje)?.mensaje ?? null,
    vecinoNombre: (d.nombre as string) ?? (d.vecinoNombre as string) ?? "Vecino",
    telefono: (d.telefono as string) ?? undefined, vecinoUid: (d.uid as string) ?? undefined,
    historial, creadoEn: (d.creadoEn as Timestamp) ?? Timestamp.now(),
  };
}

const semillaReportes = (): Reporte[] => [
  { id: "r1", folio: "TEC-8492", tipo: "bache", colonia: "Teocaltiche Centro", direccion: "Zaragoza 45", descripcion: "Bache grande frente a la farmacia, ya se metió un carro.", fotoUrl: null, lat: 21.4282, lng: -102.5771, estado: "recibido", respuesta: null, vecinoNombre: "Ana G.", telefono: "346 ••• 4821", historial: [], creadoEn: hace(2) },
  { id: "r2", folio: "TEC-8488", tipo: "fuga", colonia: "San Miguel Norte", direccion: "Morelos 8", descripcion: "Sale agua de la banqueta desde ayer.", fotoUrl: null, lat: 21.4313, lng: -102.5702, estado: "en_proceso", respuesta: "La cuadrilla va en camino.", vecinoNombre: "Pedro L.", telefono: "346 ••• 1190", historial: [{ estado: "en_proceso", mensaje: "La cuadrilla va en camino.", autor: "Laura M.", fecha: hace(6) }], creadoEn: hace(9) },
  { id: "r3", folio: "TEC-8475", tipo: "luminaria", colonia: "El Tanque", direccion: "Hidalgo 12", descripcion: "La lámpara de la esquina no prende.", fotoUrl: null, lat: 21.4236, lng: -102.5812, estado: "recibido", respuesta: null, vecinoNombre: "Rosa M.", telefono: "+1 312 ••• 7742", historial: [], creadoEn: hace(20) },
  { id: "r4", folio: "TEC-8460", tipo: "basura", colonia: "Teocaltiche Centro", direccion: "Plaza principal", descripcion: "No pasó el camión el martes.", fotoUrl: null, lat: 21.4268, lng: -102.5759, estado: "resuelto", respuesta: "Se hizo una ruta extra el miércoles.", vecinoNombre: "Luis C.", telefono: "346 ••• 3307", historial: [{ estado: "resuelto", mensaje: "Se hizo una ruta extra el miércoles.", autor: "Jorge R.", fecha: hace(30) }], creadoEn: hace(52) },
];
const demoReportes: Reporte[] = firebaseListo ? [] : semillaReportes();

export async function listarReportes(max = 300): Promise<Reporte[]> {
  if (!firebaseListo || !db) return [...demoReportes].sort(porFecha);
  const snap = await getDocs(query(coleccion("reportes"), orderBy("creadoEn", "desc"), limit(max)));
  return snap.docs.map((d) => normalizarReporte(d.id, d.data()));
}

/** Cuenta en el servidor los reportes sin resolver */
export async function reportesPorAtender(): Promise<number> {
  if (!firebaseListo || !db) return demoReportes.filter((r) => r.estado !== "resuelto").length;
  const snap = await getCountFromServer(query(coleccion("reportes"), where("estado", "in", ["recibido", "en_proceso"])));
  return snap.data().count;
}

export async function cambiarEstadoReporte(r: Reporte, estado: EstadoReporte, respuesta: string, autorNombre: string, autorUid: string): Promise<void> {
  const detalle = `${r.folio} · ${ETIQUETA_REPORTE[r.tipo]} · ${ETIQUETA_ESTADO_REPORTE[estado]}`;
  const evento: EventoReporte = { estado, mensaje: respuesta, autor: autorNombre, fecha: firebaseListo ? Timestamp.now() : new Date() };
  if (!firebaseListo || !db) {
    const d = demoReportes.find((x) => x.id === r.id);
    if (d) { d.estado = estado; d.respuesta = respuesta || null; d.historial = [...d.historial, evento]; }
    demo.audit.unshift({ accion: "Atendió reporte", detalle, canal: "publico", autorNombre, creadoEn: new Date() });
    return;
  }
  const lote = writeBatch(db);
  const ahora = serverTimestamp();
  lote.update(documento("reportes", r.id!), { estado, respuesta: respuesta || null, historial: arrayUnion(evento), actualizadoEn: ahora });
  lote.set(doc(coleccion("auditoria")), { accion: "Atendió reporte", detalle, canal: "publico", autorNombre, autorUid, creadoEn: ahora });
  if (r.vecinoUid) {
    // Aviso solo al vecino que reportó
    lote.set(doc(coleccion("notificaciones")), {
      titulo: `Tu reporte ${r.folio}: ${ETIQUETA_ESTADO_REPORTE[estado]}`, cuerpo: respuesta || ETIQUETA_REPORTE[r.tipo],
      colonias: null, segmento: { uids: [r.vecinoUid] }, programadaPara: Timestamp.now(), estado: "pendiente",
      origen: { coleccion: "reportes", id: r.id }, autorUid, creadoEn: ahora,
    });
  }
  await lote.commit();
}

/* ─── Personal ──────────────────────────────────────────── */

export interface Usuario {
  id?: string;
  nombre: string;
  rol: "funcionario" | "admin" | "plataforma";
  area: string;
  email?: string;
}

/** Personal del municipio. El rol en usuarios/{uid} es espejo del custom claim. */
export async function listarPersonal(): Promise<Usuario[]> {
  if (!firebaseListo || !db) {
    return [
      { id: "u1", nombre: "Admin", rol: "admin", area: "Presidencia" },
      { id: "u2", nombre: "Laura M.", rol: "funcionario", area: "Agua Potable" },
      { id: "u3", nombre: "Jorge R.", rol: "funcionario", area: "Agua Potable" },
      { id: "u4", nombre: "Comunicación", rol: "funcionario", area: "Comunicación Social" },
    ];
  }
  const snap = await getDocs(query(collection(db, "usuarios"), where("municipioId", "==", municipioId()), where("rol", "in", ["funcionario", "admin"])));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Usuario));
}

/** Deja constancia en la bitácora de auditoría (inmutable) */
export async function registrar(accion: string, detalle: string, canal: Canal, autorNombre: string): Promise<void> {
  if (!firebaseListo || !db) {
    demo.audit.unshift({ accion, detalle, canal, autorNombre, creadoEn: new Date() });
    return;
  }
  await addDoc(coleccion("auditoria"), { accion, detalle, canal, autorNombre, creadoEn: serverTimestamp() });
}
