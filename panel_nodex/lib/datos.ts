import {
  collection, addDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp, Timestamp, doc, updateDoc,
} from "firebase/firestore";
import { db, firebaseListo, MUNICIPIO_ID } from "./firebase";

/* ─── Modelo ────────────────────────────────────────────────
   Una sola colección "publicaciones" para todo lo que sale a la
   app o se queda interno. Agua, cortes, cartelera y avisos son
   el mismo documento con distinto `tipo`. Así, agregar un módulo
   nuevo es contenido, no código.
   ───────────────────────────────────────────────────────── */

export type Estado = "activo" | "sin_servicio" | "sin_dato";
export type Canal = "publico" | "interno";
export type Tipo =
  | "agua" | "corte" | "incidente" | "basura" | "cierre" | "escuela"
  | "noticia" | "parroquia" | "esquela" | "cartelera"
  | "vacante" | "clasificado" | "paisanos" | "contacto"
  | "aviso_interno" | "dependencia";

export interface Publicacion {
  id?: string;
  municipioId: string;
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
  alcance: number;
  autorNombre: string;
  autorUid: string;
  creadoEn: Timestamp | Date;
  /** campos propios de cada módulo (escenario, escuela, teléfono…), ver lib/modulos.ts */
  datos?: Record<string, string>;
}

export interface Auditoria {
  id?: string;
  municipioId: string;
  accion: string;
  detalle: string;
  canal: Canal;
  autorNombre: string;
  creadoEn: Timestamp | Date;
}

export const ZONAS = ["Centro y zonas tradicionales", "Colonias y fraccionamientos"] as const;

/* Colonias de Teocaltiche. `vecinos` es una estimación para la demo; con
   Firebase se calcula de los vecinos registrados. Horario de agua y pozo
   se capturan en Administración → Colonias. */
export const COLONIAS: { nombre: string; zona: (typeof ZONAS)[number]; vecinos: number; horario: string; pozo: string }[] = [
  { nombre: "Teocaltiche Centro", zona: ZONAS[0], vecinos: 184, horario: "", pozo: "" },
  { nombre: "El Nejayote", zona: ZONAS[0], vecinos: 41, horario: "", pozo: "" },
  { nombre: "El Tanque", zona: ZONAS[0], vecinos: 37, horario: "", pozo: "" },
  { nombre: "El Santuario", zona: ZONAS[0], vecinos: 52, horario: "", pozo: "" },
  { nombre: "Bellavista", zona: ZONAS[1], vecinos: 33, horario: "", pozo: "" },
  { nombre: "CTM (Los Órganos)", zona: ZONAS[1], vecinos: 46, horario: "", pozo: "" },
  { nombre: "Colinas de la Cruz", zona: ZONAS[1], vecinos: 28, horario: "", pozo: "" },
  { nombre: "San Miguel Norte", zona: ZONAS[1], vecinos: 61, horario: "", pozo: "" },
  { nombre: "San Miguel Sur", zona: ZONAS[1], vecinos: 55, horario: "", pozo: "" },
  { nombre: "Tavares", zona: ZONAS[1], vecinos: 24, horario: "", pozo: "" },
  { nombre: "Los Ángeles", zona: ZONAS[1], vecinos: 31, horario: "", pozo: "" },
  { nombre: "Los Arcos", zona: ZONAS[1], vecinos: 22, horario: "", pozo: "" },
  { nombre: "Maravillas", zona: ZONAS[1], vecinos: 27, horario: "", pozo: "" },
  { nombre: "Arboledas", zona: ZONAS[1], vecinos: 19, horario: "", pozo: "" },
  { nombre: "Magisterial", zona: ZONAS[1], vecinos: 26, horario: "", pozo: "" },
  { nombre: "San Pedro", zona: ZONAS[1], vecinos: 35, horario: "", pozo: "" },
  { nombre: "Lomas de Teocaltiche", zona: ZONAS[1], vecinos: 18, horario: "", pozo: "" },
];

/** Vecinos con la app por colonia; sin colonia = todo el municipio */
export function alcanceDe(colonia: string | null): number {
  if (!colonia) return COLONIAS.reduce((s, c) => s + c.vecinos, 0);
  return COLONIAS.find((c) => c.nombre === colonia)?.vecinos ?? 0;
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

/* ─── Almacén en memoria para modo demo ─────────────────── */
const demo: { pubs: Publicacion[]; audit: Auditoria[] } = { pubs: [], audit: [] };

function hace(horas: number) {
  return new Date(Date.now() - horas * 3600_000);
}

if (!firebaseListo) {
  demo.pubs = [
    {
      municipioId: MUNICIPIO_ID, tipo: "agua", canal: "publico", colonia: "Teocaltiche Centro",
      estado: "sin_servicio", titulo: "Agua · Teocaltiche Centro",
      mensaje: "Falla en el pozo. La cuadrilla ya está trabajando en la reparación.",
      horaEstimada: "16:00", publicarEn: hace(14), caducaEn: hace(-10), notificar: true,
      alcance: 184, autorNombre: "Laura M.", autorUid: "demo", creadoEn: hace(14),
    },
    {
      municipioId: MUNICIPIO_ID, tipo: "corte", canal: "publico", colonia: "Teocaltiche Centro",
      estado: null, titulo: "Mantenimiento de red · Teocaltiche Centro",
      mensaje: "De 8:00 a 14:00 hrs por cambio de tubería.",
      horaEstimada: null, publicarEn: hace(26), caducaEn: null, notificar: false,
      alcance: 184, autorNombre: "Jorge R.", autorUid: "demo", creadoEn: hace(26),
    },
  ];
  demo.audit = [
    { municipioId: MUNICIPIO_ID, accion: "Publicó estado de agua", detalle: "Teocaltiche Centro · Sin servicio", canal: "publico", autorNombre: "Laura M.", creadoEn: hace(14) },
    { municipioId: MUNICIPIO_ID, accion: "Envió notificación", detalle: "184 vecinos de Teocaltiche Centro", canal: "publico", autorNombre: "Laura M.", creadoEn: hace(14) },
    { municipioId: MUNICIPIO_ID, accion: "Programó corte", detalle: "Teocaltiche Centro · 10 de octubre", canal: "publico", autorNombre: "Jorge R.", creadoEn: hace(26) },
    { municipioId: MUNICIPIO_ID, accion: "Publicó aviso interno", detalle: "Junta de dependencias del viernes", canal: "interno", autorNombre: "Admin", creadoEn: hace(30) },
  ];
}

export function aFecha(v: Timestamp | Date | null | undefined): Date | null {
  if (!v) return null;
  return v instanceof Date ? v : v.toDate();
}

/* ─── Lecturas ──────────────────────────────────────────── */

export async function ultimaDeTipo(tipo: Tipo, colonia?: string): Promise<Publicacion | null> {
  if (!firebaseListo || !db) {
    const l = demo.pubs
      .filter((p) => p.tipo === tipo && (!colonia || p.colonia === colonia))
      .sort((a, b) => +aFecha(b.creadoEn)! - +aFecha(a.creadoEn)!);
    return l[0] ?? null;
  }
  const filtros = [where("municipioId", "==", MUNICIPIO_ID), where("tipo", "==", tipo)];
  if (colonia) filtros.push(where("colonia", "==", colonia));
  const snap = await getDocs(query(collection(db, "publicaciones"), ...filtros, orderBy("creadoEn", "desc"), limit(1)));
  const d = snap.docs[0];
  return d ? ({ id: d.id, ...d.data() } as Publicacion) : null;
}

export async function actividadReciente(n = 6): Promise<Auditoria[]> {
  if (!firebaseListo || !db) {
    return [...demo.audit].sort((a, b) => +aFecha(b.creadoEn)! - +aFecha(a.creadoEn)!).slice(0, n);
  }
  const snap = await getDocs(
    query(collection(db, "auditoria"), where("municipioId", "==", MUNICIPIO_ID), orderBy("creadoEn", "desc"), limit(n))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Auditoria));
}

export async function publicacionesDeTipo(tipo: Tipo, n = 20): Promise<Publicacion[]> {
  if (!firebaseListo || !db) {
    return demo.pubs
      .filter((p) => p.tipo === tipo)
      .sort((a, b) => +aFecha(b.creadoEn)! - +aFecha(a.creadoEn)!)
      .slice(0, n);
  }
  const snap = await getDocs(query(
    collection(db, "publicaciones"),
    where("municipioId", "==", MUNICIPIO_ID), where("tipo", "==", tipo),
    orderBy("creadoEn", "desc"), limit(n),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Publicacion));
}

export async function metricas() {
  if (!firebaseListo || !db) {
    return { vecinos: 184, publicaciones: demo.pubs.length, notificaciones: demo.pubs.filter((p) => p.notificar).length };
  }
  const snap = await getDocs(query(collection(db, "publicaciones"), where("municipioId", "==", MUNICIPIO_ID)));
  const pubs = snap.docs.map((d) => d.data() as Publicacion);
  const desde = Date.now() - 7 * 86400_000;
  return {
    vecinos: 184,
    publicaciones: pubs.filter((p) => +aFecha(p.creadoEn)! > desde).length,
    notificaciones: pubs.filter((p) => p.notificar && +aFecha(p.creadoEn)! > desde).length,
  };
}

/* ─── Escrituras ────────────────────────────────────────── */

export async function publicar(
  p: Omit<Publicacion, "municipioId" | "creadoEn">,
  accion = "Publicó estado de agua"
): Promise<void> {
  const base = { ...p, municipioId: MUNICIPIO_ID };
  const detalle = p.tipo === "agua"
    ? `${p.colonia ?? "Todo el municipio"}${p.estado ? ` · ${ETIQUETA_ESTADO[p.estado]}` : ""}`
    : `${p.titulo}${p.colonia ? ` · ${p.colonia}` : ""}`;
  const detalleAviso = `${p.alcance} vecinos de ${p.colonia ?? "todo el municipio"}`;

  if (!firebaseListo || !db) {
    demo.pubs.unshift({ ...base, creadoEn: new Date() } as Publicacion);
    demo.audit.unshift({ municipioId: MUNICIPIO_ID, accion, detalle, canal: p.canal, autorNombre: p.autorNombre, creadoEn: new Date() });
    if (p.notificar) {
      demo.audit.unshift({ municipioId: MUNICIPIO_ID, accion: "Envió notificación", detalle: detalleAviso, canal: p.canal, autorNombre: p.autorNombre, creadoEn: new Date() });
    }
    return;
  }

  await addDoc(collection(db, "publicaciones"), { ...base, creadoEn: serverTimestamp() });
  await addDoc(collection(db, "auditoria"), {
    municipioId: MUNICIPIO_ID, accion, detalle, canal: p.canal,
    autorNombre: p.autorNombre, creadoEn: serverTimestamp(),
  });
  if (p.notificar) {
    // El envío real del push lo hace una Cloud Function que escucha esta colección.
    await addDoc(collection(db, "auditoria"), {
      municipioId: MUNICIPIO_ID, accion: "Envió notificación",
      detalle: detalleAviso, canal: p.canal,
      autorNombre: p.autorNombre, creadoEn: serverTimestamp(),
    });
  }
}

/** Horas transcurridas desde la última actualización, para el aviso de dato caducado */
export function horasDesde(v: Timestamp | Date | null | undefined): number | null {
  const f = aFecha(v);
  return f ? Math.floor((Date.now() - +f) / 3600_000) : null;
}

export function haceTexto(v: Timestamp | Date | null | undefined): string {
  const h = horasDesde(v);
  if (h === null) return "—";
  if (h < 1) return "hace unos minutos";
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

/* ─── Demo: contenido de los módulos que pinta el Figma de la app ─── */

if (!firebaseListo) {
  const base = { municipioId: MUNICIPIO_ID, canal: "publico" as Canal, estado: null, horaEstimada: null, caducaEn: null, notificar: false, autorUid: "demo" };
  const pub = (tipo: Tipo, h: number, autor: string, titulo: string, mensaje: string, colonia: string | null, datos: Record<string, string> = {}, extra: Partial<Publicacion> = {}): Publicacion => ({
    ...base, tipo, titulo, mensaje, colonia, datos, autorNombre: autor,
    alcance: alcanceDe(colonia), publicarEn: hace(h), creadoEn: hace(h), ...extra,
  });
  demo.pubs.push(
    pub("incidente", 14, "Laura M.", "Reporte recibido", "Vecinos de Teocaltiche Centro reportan falta de agua.", "Teocaltiche Centro", { hora: "09:20" }),
    pub("incidente", 13, "Laura M.", "Diagnóstico", "Falla confirmada en la bomba sumergible del pozo.", "Teocaltiche Centro", { hora: "10:05" }),
    pub("incidente", 12, "Laura M.", "Cuadrilla en sitio", "Personal de SAPAS trabajando en la reparación.", "Teocaltiche Centro", { hora: "11:40" }),
    pub("cierre", 20, "Obras Públicas", "Calle Zaragoza", "Entre Juárez e Hidalgo, por rehabilitación de pavimento.", "Teocaltiche Centro", { categoria: "Cierre total", lugar: "Zaragoza entre Juárez e Hidalgo", fecha: "2026-10-01", hasta: "2026-10-22", ruta: "Por Morelos" }),
    pub("basura", 3, "Jorge R.", "Ruta Centro · Unidad 04", "Llega aproximadamente a las 7:25 hrs.", "Teocaltiche Centro", { dias: "M,V", hora: "07:25" }),
    pub("cierre", 30, "Obras Públicas", "Rehabilitación de calle 2 de Abril inicia el lunes", "Un carril cerrado en dirección norte, de 8:00 a 18:00 hrs.", "Teocaltiche Centro", { categoria: "Obra", lugar: "Calle 2 de Abril", fecha: "2026-10-12", hasta: "2026-11-05", ruta: "Por Hidalgo y Morelos" }),
    pub("escuela", 5, "Educación", "Suspensión de clases · CBTIS 247", "Viernes 16: no hay clases por junta de consejo técnico escolar. Se reanudan el lunes 19.", null, { escuela: "CBTIS 247", categoria: "Suspensión de clases", fecha: "2026-10-16" }),
    pub("escuela", 26, "Educación", "Aviso · Secundaria Federal 20", "Entrega de boletas el lunes 19, de 9:00 a 13:00 hrs en cada aula. Asistencia de padres obligatoria.", null, { escuela: "Secundaria Federal 20", categoria: "Aviso", fecha: "2026-10-19" }),
    pub("noticia", 2, "Comunicación", "Rehabilitación de calle Benito Juárez inicia el lunes", "Habrá desvíos por Hidalgo y Morelos durante tres semanas.", null, { categoria: "Obras" }),
    pub("noticia", 5, "Comunicación", "Campaña de vacunación en el Centro de Salud", "Del 7 al 11 de octubre, de 9:00 a 14:00 hrs. Lleva tu cartilla.", null, { categoria: "Salud" }),
    pub("parroquia", 20, "Parroquia", "Misa dominical", "Misa dominical a las 7:00 hrs.", null, { templo: "Parroquia de San Miguel Arcángel", fecha: "2026-10-05", hora: "07:00" }),
    pub("esquela", 4, "Comunicación", "Ma. de Jesús Torres Villanueva", "Misa de cuerpo presente hoy a las 18:00 hrs.", null, { lugar: "Templo de El Señor de Las Maravillas", fallecio: "2026-10-03", fecha: "2026-10-04", hora: "18:00" }),
    pub("vacante", 26, "Desarrollo Económico", "Secretaria bilingüe", "Inglés intermedio, manejo de Office. Lunes a viernes.", null, { negocio: "Notaría Pública No. 4", categoria: "Tiempo completo", salario: "$9,000 / mes", contacto: "346 787 0000" }),
    pub("clasificado", 50, "Desarrollo Económico", "Nissan Versa 2019 en buen estado", "60 mil km, factura original.", null, { categoria: "Vehículo", precio: "$145,000", contacto: "346 100 2030" }),
    pub("paisanos", 72, "Atención a Migrantes", "Pago de predial desde el extranjero", "Paga el predial de tu casa en Teocaltiche desde EE. UU. con tarjeta.", null, { categoria: "Predial", enlace: "https://teocaltiche.gob.mx/predial" }),
    pub("contacto", 200, "Admin", "Protección Civil", "Atención 24 horas.", null, { telefono: "346 787 0911", categoria: "Emergencias" }),
    pub("contacto", 200, "Admin", "Cruz Roja", "Ambulancias 24 horas.", null, { telefono: "346 787 0065", categoria: "Salud" }),
    pub("contacto", 200, "Admin", "Policía Municipal", "Atención 24 horas.", null, { telefono: "346 787 0060", categoria: "Seguridad" }),
    pub("contacto", 200, "Admin", "Agua Potable · SAPAS", "Fugas y falta de agua.", null, { telefono: "346 787 0220", categoria: "Servicios" }),
    pub("aviso_interno", 30, "Admin", "Junta de dependencias del viernes", "Viernes 10:00 hrs en sala de Cabildo. Traer avance de reportes.", null, { area: "Todas", prioridad: "Normal" }, { canal: "interno" }),
    pub("dependencia", 200, "Admin", "Obras Públicas", "Ing. Ramírez · ext. 114", null, { telefono: "346 787 0114", area: "Obras Públicas" }, { canal: "interno" }),
  );
}

/* ─── Reportes ciudadanos ───────────────────────────────────
   Los manda el vecino desde la app (foto, GPS, folio). El panel
   no los crea: los atiende y cambia su estado. Cada cambio queda
   en la bitácora de auditoría.
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

export interface Reporte {
  id?: string;
  municipioId: string;
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
  creadoEn: Timestamp | Date;
}

const demoReportes: Reporte[] = firebaseListo ? [] : [
  { id: "r1", municipioId: MUNICIPIO_ID, folio: "TEC-8492", tipo: "bache", colonia: "Teocaltiche Centro", direccion: "Zaragoza 45", descripcion: "Bache grande frente a la farmacia, ya se metió un carro.", fotoUrl: null, lat: 21.4282, lng: -102.5771, estado: "recibido", respuesta: null, vecinoNombre: "Ana G.", telefono: "346 ••• 4821", creadoEn: hace(2) },
  { id: "r2", municipioId: MUNICIPIO_ID, folio: "TEC-8488", tipo: "fuga", colonia: "San Miguel Norte", direccion: "Morelos 8", descripcion: "Sale agua de la banqueta desde ayer.", fotoUrl: null, lat: 21.4313, lng: -102.5702, estado: "en_proceso", respuesta: "La cuadrilla va en camino.", vecinoNombre: "Pedro L.", telefono: "346 ••• 1190", creadoEn: hace(9) },
  { id: "r3", municipioId: MUNICIPIO_ID, folio: "TEC-8475", tipo: "luminaria", colonia: "El Tanque", direccion: "Hidalgo 12", descripcion: "La lámpara de la esquina no prende.", fotoUrl: null, lat: 21.4236, lng: -102.5812, estado: "recibido", respuesta: null, vecinoNombre: "Rosa M.", telefono: "+1 312 ••• 7742", creadoEn: hace(20) },
  { id: "r4", municipioId: MUNICIPIO_ID, folio: "TEC-8460", tipo: "basura", colonia: "Teocaltiche Centro", direccion: "Plaza principal", descripcion: "No pasó el camión el martes.", fotoUrl: null, lat: 21.4268, lng: -102.5759, estado: "resuelto", respuesta: "Se hizo una ruta extra el miércoles.", vecinoNombre: "Luis C.", telefono: "346 ••• 3307", creadoEn: hace(52) },
];

export async function listarReportes(): Promise<Reporte[]> {
  if (!firebaseListo || !db) {
    return [...demoReportes].sort((a, b) => +aFecha(b.creadoEn)! - +aFecha(a.creadoEn)!);
  }
  const snap = await getDocs(query(
    collection(db, "reportes"), where("municipioId", "==", MUNICIPIO_ID),
    orderBy("creadoEn", "desc"), limit(200),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reporte));
}

export async function reportesPorAtender(): Promise<number> {
  const l = await listarReportes();
  return l.filter((r) => r.estado !== "resuelto").length;
}

export async function cambiarEstadoReporte(
  r: Reporte, estado: EstadoReporte, respuesta: string, autorNombre: string,
): Promise<void> {
  const detalle = `${r.folio} · ${ETIQUETA_REPORTE[r.tipo]} · ${ETIQUETA_ESTADO_REPORTE[estado]}`;
  if (!firebaseListo || !db) {
    const d = demoReportes.find((x) => x.id === r.id);
    if (d) { d.estado = estado; d.respuesta = respuesta || null; }
    demo.audit.unshift({ municipioId: MUNICIPIO_ID, accion: "Atendió reporte", detalle, canal: "publico", autorNombre, creadoEn: new Date() });
    return;
  }
  await updateDoc(doc(db, "reportes", r.id!), { estado, respuesta: respuesta || null, actualizadoEn: serverTimestamp() });
  await addDoc(collection(db, "auditoria"), {
    municipioId: MUNICIPIO_ID, accion: "Atendió reporte", detalle, canal: "publico",
    autorNombre, creadoEn: serverTimestamp(),
  });
}

/* ─── Usuarios y áreas ──────────────────────────────────── */

export interface Usuario {
  id?: string;
  nombre: string;
  rol: "admin" | "operador";
  area: string;
  municipioId: string;
}

export async function listarUsuarios(): Promise<Usuario[]> {
  if (!firebaseListo || !db) {
    return [
      { id: "u1", nombre: "Admin", rol: "admin", area: "Presidencia", municipioId: MUNICIPIO_ID },
      { id: "u2", nombre: "Laura M.", rol: "operador", area: "Agua Potable", municipioId: MUNICIPIO_ID },
      { id: "u3", nombre: "Jorge R.", rol: "operador", area: "Agua Potable", municipioId: MUNICIPIO_ID },
      { id: "u4", nombre: "Comunicación", rol: "operador", area: "Comunicación Social", municipioId: MUNICIPIO_ID },
    ];
  }
  const snap = await getDocs(query(collection(db, "usuarios"), where("municipioId", "==", MUNICIPIO_ID)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Usuario));
}

/** Deja constancia en la bitácora de auditoría (inmutable) */
export async function registrar(accion: string, detalle: string, canal: Canal, autorNombre: string): Promise<void> {
  if (!firebaseListo || !db) {
    demo.audit.unshift({ municipioId: MUNICIPIO_ID, accion, detalle, canal, autorNombre, creadoEn: new Date() });
    return;
  }
  await addDoc(collection(db, "auditoria"), {
    municipioId: MUNICIPIO_ID, accion, detalle, canal, autorNombre, creadoEn: serverTimestamp(),
  });
}
