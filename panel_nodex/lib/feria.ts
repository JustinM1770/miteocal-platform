import { getAggregateFromServer, query, runTransaction, serverTimestamp, sum, count, where, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { coleccion, db, documento, firebaseListo } from "./firebase";
import { registrar } from "./datos";
import { cfg } from "./config";
import { actualizar, azar, contar, crear, diaLocal, f, guardarVarios, leer, leerPagina, siguienteFolio, type Fecha, type Pagina } from "./almacen";
import { aSlug } from "./config";
import { demoVecinos, ORIGENES } from "./vecinos";

/* ─── Feria ─────────────────────────────────────────────────
   Programa, certámenes, Hijos Ausentes, transmisiones y venta de
   boletos (Figma 05 · Feria y 06 · Paisanos). Los pagos están
   simulados: el panel deja todo listo para conectar la pasarela.
   ───────────────────────────────────────────────────────── */

/** Nombre y fechas de la feria: config/feria del municipio */
export const feria = () => cfg().feria;

export type CategoriaEvento =
  | "concierto" | "toros" | "palenque" | "religioso" | "cultural"
  | "infantil" | "certamen" | "hijos_ausentes";

export const CATEGORIAS: Record<CategoriaEvento, { nombre: string; color: string; icono: string }> = {
  concierto: { nombre: "Conciertos", color: "azul", icono: "♪" },
  toros: { nombre: "Toros y jaripeo", color: "naranja", icono: "♞" },
  palenque: { nombre: "Palenque", color: "rojo", icono: "◆" },
  religioso: { nombre: "Misas y procesiones", color: "gris", icono: "✝" },
  cultural: { nombre: "Cultura", color: "morado", icono: "✦" },
  infantil: { nombre: "Infantil", color: "verde", icono: "☺" },
  certamen: { nombre: "Certámenes", color: "morado", icono: "♛" },
  hijos_ausentes: { nombre: "Hijos Ausentes", color: "azul", icono: "✈" },
};

/** Escenarios del recinto: config/catalogos del municipio */
export const escenarios = () => cfg().catalogos.escenarios;

export interface Zona { nombre: string; precio: number; cupo: number }

export interface Evento {
  id?: string;
  titulo: string;
  categoria: CategoriaEvento;
  escenario: string;
  fecha: string;
  hora: string;
  descripcion: string;
  /** vacío = entrada libre */
  zonas: Zona[];
  transmitir: boolean;
  publicado: boolean;
}

export type Certamen = "reina" | "miss_chiquitita";
export const CERTAMENES: Record<Certamen, string> = { reina: "Reina de la Feria", miss_chiquitita: "Miss Chiquitita" };

export interface Candidata {
  id?: string;
  certamen: Certamen;
  nombre: string;
  edad: number;
  representa: string;
  semblanza: string;
  color: string;
  /** foto en Storage; si no hay, se muestran iniciales sobre `color` */
  foto?: string;
}

export interface EstadoCertamen {
  id?: string;
  certamen: Certamen;
  votacionAbierta: boolean;
  cierraEn: string;
  ganadoraId: string | null;
}

/** Un voto por vecino verificado por SMS y por certamen */
/** Un voto por vecino y certamen: id `<certamen>_<uid>`. Guarda colonia y tipo del
    votante para que el panel no tenga que leer datos personales en usuarios. */
export interface Voto { id?: string; uid: string; certamen: Certamen; candidataId: string; colonia: string; tipo: "local" | "paisano"; creadoEn: Fecha }

export type EstadoTransmision = "programada" | "en_vivo" | "terminada";
export interface Transmision {
  id?: string;
  titulo: string;
  eventoId: string | null;
  url: string;
  estado: EstadoTransmision;
  inicio: Fecha;
  espectadores: number;
  pico: number;
}

export interface RegistroPaisano {
  id?: string;
  uid: string | null;
  nombre: string;
  origen: string;
  llega: string;
  personas: number;
  desfile: boolean;
}

/* ─── Pagos en línea (simulados) ─── */

export type Concepto = "boleto" | "agua" | "predial" | "acta";
export type MetodoPago = "tarjeta" | "oxxo" | "spei" | "taquilla";
export type EstadoPago = "pagado" | "pendiente" | "reembolsado";

export const CONCEPTOS: Record<Concepto, string> = { boleto: "Boletos de feria", agua: "Pago de agua", predial: "Predial", acta: "Actas" };
export const METODOS: Record<MetodoPago, string> = { tarjeta: "Tarjeta", oxxo: "OXXO", spei: "Transferencia SPEI", taquilla: "Taquilla" };

export interface Pago {
  id?: string;
  folio: string;
  uid: string | null;
  concepto: Concepto;
  descripcion: string;
  monto: number;
  moneda: "MXN" | "USD";
  metodo: MetodoPago;
  /** simulacion: compra de prueba hecha desde el panel; nunca cuenta como venta real */
  canal: "app" | "taquilla" | "simulacion";
  simulado?: boolean;
  /** referencia de pago para OXXO / SPEI mientras está pendiente */
  referencia?: string;
  estado: EstadoPago;
  creadoEn: Fecha;
  /* solo boletos */
  eventoId?: string;
  zona?: string;
  cantidad?: number;
  usado?: boolean;
  usadoEn?: Fecha | null;
  /* datos del comprador copiados al pagar: el panel no lee usuarios para mostrarlos */
  compradorNombre?: string;
  compradorColonia?: string;
  compradorTipo?: "local" | "paisano" | null;
  compradorOrigen?: string | null;
}

/* ─── Datos demo ────────────────────────────────────────── */

const ev = (id: string, titulo: string, categoria: CategoriaEvento, escenario: string, fecha: string, hora: string, descripcion: string, zonas: Zona[] = [], transmitir = false): Evento =>
  ({ id, titulo, categoria, escenario, fecha, hora, descripcion, zonas, transmitir, publicado: true });

/** Programa real de la Feria de Noviembre 2026 (lo dio el municipio).
    Los precios de la Plaza de Toros son DE EJEMPLO para la cuenta de prueba. */
const EVENTOS: Evento[] = [
  ev("e01", "Inauguración · Certamen Srita. Teocaltiche · Mario Bautista", "certamen", "Plaza principal", "2026-10-30", "21:00", "Arranca la feria con la elección de Srita. Teocaltiche 2026 y la presentación de Mario Bautista.", []),
  ev("e02", "Certamen Miss Chiquitita · Tributo Las Guerreras del K-pop", "certamen", "Plaza principal", "2026-10-31", "21:00", "Las niñas del municipio compiten por la corona de Miss Chiquitita. Después, tributo a Las Guerreras del K-pop.", []),
  ev("e03", "Los Cadetes de Linares", "concierto", "Plaza principal", "2026-11-01", "21:00", "Música norteña en la plaza principal.", []),
  ev("e04", "Talentos Locales", "cultural", "Plaza principal", "2026-11-02", "21:00", "Artistas de Teocaltiche en el escenario de la plaza.", []),
  ev("e05", "Talentos Locales", "cultural", "Plaza principal", "2026-11-03", "21:00", "Artistas de Teocaltiche en el escenario de la plaza.", []),
  ev("e06", "Talentos Locales", "cultural", "Plaza principal", "2026-11-04", "21:00", "Artistas de Teocaltiche en el escenario de la plaza.", []),
  ev("e07", "Jaripeo con Ulises Quintero", "toros", "Plaza de Toros", "2026-11-05", "21:00", "Jaripeo y música en la Plaza de Toros.", [{ nombre: "General", precio: 250, cupo: 2500 }, { nombre: "Preferente", precio: 450, cupo: 600 }], true),
  ev("e08", "Lenin Ramírez", "concierto", "Plaza de Toros", "2026-11-06", "21:00", "Concierto en la Plaza de Toros.", [{ nombre: "General", precio: 450, cupo: 2500 }, { nombre: "Preferente", precio: 800, cupo: 600 }, { nombre: "VIP", precio: 1500, cupo: 150 }], true),
  ev("e09", "La Adictiva", "concierto", "Plaza de Toros", "2026-11-07", "21:00", "Banda sinaloense en la Plaza de Toros.", [{ nombre: "General", precio: 500, cupo: 2500 }, { nombre: "Preferente", precio: 900, cupo: 600 }, { nombre: "VIP", precio: 1600, cupo: 150 }], true),
  ev("e10", "La Arrolladora Banda El Limón", "concierto", "Plaza de Toros", "2026-11-08", "21:00", "Banda sinaloense en la Plaza de Toros.", [{ nombre: "General", precio: 550, cupo: 2500 }, { nombre: "Preferente", precio: 950, cupo: 600 }, { nombre: "VIP", precio: 1800, cupo: 150 }], true),
  ev("e11", "La Sonora Dinamita", "concierto", "Plaza principal", "2026-11-09", "21:00", "Cumbia en la plaza principal.", []),
  ev("e12", "Banda La Fresa", "concierto", "Plaza principal", "2026-11-10", "21:00", "Banda en la plaza principal.", []),
  ev("e13", "Joss Favela", "concierto", "Plaza principal", "2026-11-11", "21:00", "Concierto en la plaza principal.", []),
  ev("e14", "Talentos Locales", "cultural", "Plaza principal", "2026-11-12", "21:00", "Cierre de la feria con artistas de Teocaltiche.", []),
];

/** Candidatas reales de la Feria 2026 */
const CANDIDATAS: Candidata[] = [
  { id: "r1", certamen: "reina", nombre: "Nicole Ramírez", edad: 0, representa: "Teocaltiche", semblanza: "", color: "#f2f2ef" },
  { id: "r2", certamen: "reina", nombre: "Allison Ramírez", edad: 0, representa: "Teocaltiche", semblanza: "", color: "#f2f2ef" },
  { id: "r3", certamen: "reina", nombre: "Alondra Ruvalcaba", edad: 0, representa: "Teocaltiche", semblanza: "", color: "#f2f2ef" },
  { id: "r4", certamen: "reina", nombre: "Daira Espinola", edad: 0, representa: "Teocaltiche", semblanza: "", color: "#f2f2ef" },
  { id: "m1", certamen: "miss_chiquitita", nombre: "Alexa", edad: 0, representa: "Teocaltiche", semblanza: "", color: "#f2f2ef" },
  { id: "m2", certamen: "miss_chiquitita", nombre: "Paulina", edad: 0, representa: "Teocaltiche", semblanza: "", color: "#f2f2ef" },
  { id: "m3", certamen: "miss_chiquitita", nombre: "Geisel", edad: 0, representa: "Teocaltiche", semblanza: "", color: "#f2f2ef" },
  { id: "m4", certamen: "miss_chiquitita", nombre: "Victoria", edad: 0, representa: "Teocaltiche", semblanza: "", color: "#f2f2ef" },
  { id: "m5", certamen: "miss_chiquitita", nombre: "Irlanda", edad: 0, representa: "Teocaltiche", semblanza: "", color: "#f2f2ef" },
];

const hace = (dias: number, horas = 0) => new Date(Date.now() - dias * 86400_000 - horas * 3600_000);

function generar() {
  const a = azar(7);
  const votos: Voto[] = [];
  const pesoReina = [0.34, 0.27, 0.17, 0.22];
  const pesoMiss = [0.41, 0.33, 0.26];
  const elegir = (p: number[]) => { let x = a.r(); for (let i = 0; i < p.length; i++) { x -= p[i]; if (x <= 0) return i; } return p.length - 1; };
  for (const v of demoVecinos) {
    if (a.r() < 0.58) votos.push({ id: `reina_${v.id}`, uid: v.id!, certamen: "reina", candidataId: CANDIDATAS[elegir(pesoReina)].id!, colonia: v.colonia, tipo: v.tipo, creadoEn: hace(a.int(0, 20)) });
    if (a.r() < 0.41) votos.push({ id: `miss_chiquitita_${v.id}`, uid: v.id!, certamen: "miss_chiquitita", candidataId: CANDIDATAS[4 + elegir(pesoMiss)].id!, colonia: v.colonia, tipo: v.tipo, creadoEn: hace(a.int(0, 20)) });
  }

  const pagos: Pago[] = [];
  let folio = 8000;
  const conBoletos = EVENTOS.filter((e) => e.zonas.length);
  // Boletos: los paisanos compran más y casi siempre con tarjeta
  const comprador = (v: (typeof demoVecinos)[number]) => ({ compradorNombre: v.nombre, compradorColonia: v.colonia, compradorTipo: v.tipo, compradorOrigen: v.origen });
  for (const v of demoVecinos) {
    // Sin precios capturados todavía no hay boletos que simular
    const compras = !conBoletos.length ? 0 : v.tipo === "paisano" ? (a.r() < 0.55 ? a.int(1, 3) : 0) : (a.r() < 0.28 ? a.int(1, 2) : 0);
    for (let i = 0; i < compras; i++) {
      const e = a.de(conBoletos);
      const z = a.r() < 0.6 ? e.zonas[0] : a.de(e.zonas);
      const cantidad = a.int(1, 4);
      const metodo: MetodoPago = v.tipo === "paisano" ? (a.r() < 0.9 ? "tarjeta" : "spei") : a.de(["tarjeta", "tarjeta", "oxxo", "spei"] as const);
      const estado: EstadoPago = metodo === "oxxo" && a.r() < 0.25 ? "pendiente" : a.r() < 0.03 ? "reembolsado" : "pagado";
      pagos.push({
        id: `p${++folio}`, folio: `TEC-${folio}`, uid: v.id!, concepto: "boleto",
        descripcion: `${e.titulo} · ${z.nombre}`, monto: z.precio * cantidad, moneda: "MXN",
        metodo, canal: "app", estado, creadoEn: hace(a.int(0, 24), a.int(0, 23)),
        eventoId: e.id, zona: z.nombre, cantidad, usado: false, usadoEn: null, ...comprador(v),
      });
    }
    // Pagos municipales desde la app
    if (a.r() < 0.18) pagos.push({ id: `p${++folio}`, folio: `TEC-${folio}`, uid: v.id!, concepto: "agua", descripcion: `Agua · ${v.colonia} · bimestre 5`, monto: a.int(180, 420), moneda: "MXN", metodo: a.de(["tarjeta", "oxxo", "spei"] as const), canal: "app", estado: "pagado", creadoEn: hace(a.int(0, 40)), ...comprador(v) });
    if (v.tipo === "paisano" && a.r() < 0.3) pagos.push({ id: `p${++folio}`, folio: `TEC-${folio}`, uid: v.id!, concepto: "predial", descripcion: `Predial 2026 · ${v.colonia}`, monto: a.int(900, 3200), moneda: "MXN", metodo: "tarjeta", canal: "app", estado: "pagado", creadoEn: hace(a.int(0, 60)), ...comprador(v) });
    if (a.r() < 0.04) pagos.push({ id: `p${++folio}`, folio: `TEC-${folio}`, uid: v.id!, concepto: "acta", descripcion: "Acta de nacimiento certificada", monto: 160, moneda: "MXN", metodo: "tarjeta", canal: "app", estado: "pagado", creadoEn: hace(a.int(0, 60)), ...comprador(v) });
  }
  // Ventas en taquilla, sin cuenta en la app
  for (let i = 0; i < (conBoletos.length ? 90 : 0); i++) {
    const e = a.de(conBoletos); const z = e.zonas[0]; const cantidad = a.int(1, 5);
    pagos.push({ id: `p${++folio}`, folio: `TEC-${folio}`, uid: null, concepto: "boleto", descripcion: `${e.titulo} · ${z.nombre}`, monto: z.precio * cantidad, moneda: "MXN", metodo: "taquilla", canal: "taquilla", estado: "pagado", creadoEn: hace(a.int(0, 15), a.int(0, 10)), eventoId: e.id, zona: z.nombre, cantidad, usado: false, usadoEn: null, compradorNombre: "Taquilla", compradorTipo: null });
  }

  // El resumen por vecino que en producción mantiene una Cloud Function
  for (const v of demoVecinos) {
    const b = pagos.filter((p) => p.uid === v.id && p.concepto === "boleto" && p.estado === "pagado");
    v.resumen = { estrellas: v.resumen?.estrellas ?? null, boletos: b.reduce((s, p) => s + (p.cantidad ?? 0), 0), gasto: b.reduce((s, p) => s + p.monto, 0) };
  }

  const paisanos = demoVecinos.filter((v) => v.tipo === "paisano");
  const registros: RegistroPaisano[] = paisanos.filter(() => a.r() < 0.45).map((v, i) => ({
    id: `h${i + 1}`, uid: v.id!, nombre: v.nombre, origen: v.origen ?? a.de(ORIGENES),
    llega: (() => { const d = new Date(`${cfg().feria.inicio}T12:00`); d.setDate(d.getDate() + a.int(0, 7)); return diaLocal(d); })(), personas: a.int(1, 6), desfile: a.r() < 0.6,
  }));

  return { votos, pagos, registros };
}

const g = firebaseListo ? { votos: [], pagos: [], registros: [] } : generar();

const demoEventos: Evento[] = firebaseListo ? [] : EVENTOS;
const demoCandidatas: Candidata[] = firebaseListo ? [] : CANDIDATAS;
const demoCertamenes: EstadoCertamen[] = firebaseListo ? [] : [
  { id: "reina", certamen: "reina", votacionAbierta: true, cierraEn: "2026-10-31T23:59", ganadoraId: null },
  { id: "miss_chiquitita", certamen: "miss_chiquitita", votacionAbierta: true, cierraEn: "2026-11-06T23:59", ganadoraId: null },
];
const demoVotos: Voto[] = g.votos;
const demoPagos: Pago[] = g.pagos;
const demoRegistros: RegistroPaisano[] = g.registros;
const demoTransmisiones: Transmision[] = firebaseListo ? [] : [
  { id: "t1", titulo: "Ensayo de coronación · prueba de señal", eventoId: "e2", url: "https://youtube.com/live/teocaltiche", estado: "terminada", inicio: hace(2), espectadores: 0, pico: 212 },
  { id: "t2", titulo: "Misa dominical en vivo", eventoId: null, url: "https://facebook.com/parroquiasanmiguel/live", estado: "en_vivo", inicio: hace(0, 1), espectadores: 412, pico: 455 },
  { id: "t3", titulo: "Banda El Recodo · Inauguración", eventoId: "e1", url: "https://youtube.com/live/teocaltiche-feria", estado: "programada", inicio: new Date("2026-11-01T22:00"), espectadores: 0, pico: 0 },
  { id: "t4", titulo: "Quema del Castillo", eventoId: "e14", url: "https://youtube.com/live/teocaltiche-castillo", estado: "programada", inicio: new Date("2026-11-15T22:00"), espectadores: 0, pico: 0 },
];

/* ─── Lecturas ──────────────────────────────────────────── */

/** eventos/{id} también lo carga el importador CSV (artista, lugar,
    precio, disponible); se completa lo que falte para que se vea igual */
function normalizarEvento(e: Evento & { artista?: string; lugar?: string; precio?: number }): Evento {
  return {
    ...e,
    titulo: e.titulo ?? e.artista ?? "Evento", escenario: e.escenario ?? e.lugar ?? "",
    categoria: e.categoria ?? "concierto", hora: e.hora ?? "", descripcion: e.descripcion ?? "",
    zonas: e.zonas ?? (e.precio ? [{ nombre: "General", precio: e.precio, cupo: 0 }] : []),
    transmitir: Boolean(e.transmitir), publicado: e.publicado !== false,
  };
}

export const listarEventos = async () =>
  (await leer("eventos", demoEventos)).map(normalizarEvento).sort((x, y) => `${x.fecha}${x.hora}`.localeCompare(`${y.fecha}${y.hora}`));
export const listarCandidatas = () => leer("candidatas", demoCandidatas);
export const listarCertamenes = () => leer("certamenes", demoCertamenes);
/** Votos sueltos (para el desglose por colonia). Los totales usan contarVotos. */
export const listarVotos = (certamen?: Certamen) => leer("votos", certamen ? demoVotos.filter((v) => v.certamen === certamen) : demoVotos, { max: 10_000, filtros: certamen ? [["certamen", certamen]] : [] });
/** Total de votos de una candidata, contado en el servidor */
export const contarVotos = (candidataId: string) => contar("votos", demoVotos, [["candidataId", candidataId]]);
export const listarTransmisiones = () => leer("transmisiones", demoTransmisiones);
export const listarRegistrosPaisanos = () => leer("registrosPaisanos", demoRegistros);
export const listarPagos = async () =>
  (await leer("pagos", demoPagos, { orden: "creadoEn" })).sort((x, y) => +f(y.creadoEn) - +f(x.creadoEn));
/** Solo boletos: su número está acotado por el cupo de los eventos */
export const listarBoletos = async () =>
  (await leer("pagos", demoPagos.filter((p) => p.concepto === "boleto"), { filtros: [["concepto", "boleto"]], max: 10_000 })).sort((x, y) => +f(y.creadoEn) - +f(x.creadoEn));
export { demoPagos };

/** Boletos vendidos por evento y zona (cuenta solo pagados) */
export function vendidos(pagos: Pago[], eventoId: string, zona?: string) {
  return pagos
    // Las compras simuladas no ocupan lugares reales
    .filter((p) => p.concepto === "boleto" && p.estado === "pagado" && !p.simulado && p.eventoId === eventoId && (!zona || p.zona === zona))
    .reduce((s, p) => s + (p.cantidad ?? 0), 0);
}

/* ─── Escrituras ────────────────────────────────────────── */

export async function guardarEvento(e: Omit<Evento, "id">, autor: string) {
  // artista/lugar/precio/disponible: el formato que ya usan la app y el importador CSV
  const paraApp = { artista: e.titulo, lugar: e.escenario, precio: e.zonas.length ? Math.min(...e.zonas.map((z) => z.precio)) : 0, disponible: true };
  const nuevo = await crear("eventos", demoEventos, { ...e, ...paraApp } as Omit<Evento, "id">);
  await registrar("Agregó evento a la feria", `${e.titulo} · ${e.fecha} ${e.hora}`, "publico", autor);
  if (e.transmitir) {
    await crear("transmisiones", demoTransmisiones, {
      titulo: e.titulo, eventoId: nuevo.id ?? null, url: "", estado: "programada",
      inicio: new Date(`${e.fecha}T${e.hora}`), espectadores: 0, pico: 0,
    });
  }
}

export async function guardarCandidata(c: Omit<Candidata, "id">, autor: string) {
  await crear("candidatas", demoCandidatas, c);
  await registrar("Registró candidata", `${CERTAMENES[c.certamen]} · ${c.nombre}`, "publico", autor);
}

export async function cambiarCertamen(c: EstadoCertamen, cambios: Partial<EstadoCertamen>, detalle: string, autor: string) {
  await actualizar("certamenes", demoCertamenes, c.id!, cambios);
  await registrar(detalle, CERTAMENES[c.certamen], "publico", autor);
}

export async function guardarTransmision(t: Omit<Transmision, "id">, autor: string) {
  await crear("transmisiones", demoTransmisiones, t);
  await registrar("Programó transmisión", t.titulo, "publico", autor);
}

/** Solo enlaces https de YouTube o Facebook Live */
export const enlaceValido = (url: string) => /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|facebook\.com|fb\.watch)\//.test(url);

export async function ponerEnlace(t: Transmision, url: string, autor: string) {
  if (!enlaceValido(url)) throw new Error("Enlace inválido");
  await actualizar("transmisiones", demoTransmisiones, t.id!, { url });
  await registrar("Agregó enlace a transmisión", t.titulo, "publico", autor);
}

export async function cambiarTransmision(t: Transmision, estado: EstadoTransmision, autor: string) {
  if (estado === "en_vivo" && !enlaceValido(t.url)) throw new Error("La transmisión no tiene enlace");
  const cambios: Partial<Transmision> = { estado };
  if (estado === "en_vivo") { cambios.inicio = new Date(); cambios.espectadores = 0; }
  if (estado === "terminada") cambios.espectadores = 0;
  await actualizar("transmisiones", demoTransmisiones, t.id!, cambios);
  await registrar(estado === "en_vivo" ? "Inició transmisión" : "Terminó transmisión", t.titulo, "publico", autor);
}

export type ResultadoValidacion = "valido" | "ya-entro" | "reembolsado" | "pendiente" | "no-existe";

/**
 * Valida un boleto en la entrada dentro de una transacción: si dos puertas
 * escanean el mismo folio al mismo tiempo, solo una lo deja pasar.
 */
export async function validarBoleto(p: Pago, autor: string): Promise<ResultadoValidacion> {
  if (!firebaseListo || !db) {
    const x = demoPagos.find((d) => d.id === p.id);
    if (!x) return "no-existe";
    if (x.estado !== "pagado") return x.estado === "reembolsado" ? "reembolsado" : "pendiente";
    if (x.usado) return "ya-entro";
    x.usado = true; x.usadoEn = new Date();
  } else {
    const ref = documento("pagos", p.id!);
    const r = await runTransaction(db, async (tx) => {
      const d = (await tx.get(ref)).data();
      if (!d) return "no-existe" as const;
      if (d.estado !== "pagado") return d.estado === "reembolsado" ? "reembolsado" as const : "pendiente" as const;
      if (d.usado) return "ya-entro" as const;
      tx.update(ref, { usado: true, usadoEn: serverTimestamp() });
      return "valido" as const;
    });
    if (r !== "valido") return r;
  }
  await registrar("Validó boleto en la entrada", `${p.folio} · ${p.descripcion}`, "interno", autor);
  return "valido";
}

export async function reembolsar(p: Pago, autor: string) {
  await actualizar("pagos", demoPagos, p.id!, { estado: "reembolsado" });
  await registrar("Reembolsó pago", `${p.folio} · ${p.descripcion}`, "interno", autor);
}

export async function venderTaquilla(e: Evento, zona: Zona, cantidad: number, autor: string) {
  const folio = await siguienteFolio("boletos", "TEC", 20000);
  await crear("pagos", demoPagos, {
    folio, uid: null, concepto: "boleto", descripcion: `${e.titulo} · ${zona.nombre}`,
    monto: zona.precio * cantidad, moneda: "MXN", metodo: "taquilla", canal: "taquilla", estado: "pagado",
    creadoEn: new Date(), eventoId: e.id, zona: zona.nombre, cantidad, usado: false, usadoEn: null,
    compradorNombre: "Taquilla", compradorTipo: null,
  });
  await registrar("Vendió boletos en taquilla", `${folio} · ${e.titulo} · ${cantidad} × ${zona.nombre}`, "interno", autor);
  return folio;
}

/* ─── Por vecino (ficha del CRM) ─── */
export const pagosDe = (uid: string) => leer("pagos", demoPagos.filter((p) => p.uid === uid), { filtros: [["uid", uid]], max: 200 });
export const votosDe = (uid: string) => leer("votos", demoVotos.filter((v) => v.uid === uid), { filtros: [["uid", uid]], max: 10 });

/* ─── Pagos en línea: página y totales en el servidor ─── */
export const paginaPagos = (cursor: QueryDocumentSnapshot<DocumentData> | null, filtros: [string, unknown][] = []): Promise<Pagina<Pago>> =>
  leerPagina("pagos", demoPagos.filter((p) => filtros.every(([c, v]) => (p as unknown as Record<string, unknown>)[c] === v)).sort((a, b) => +f(b.creadoEn) - +f(a.creadoEn)), "creadoEn", 100, cursor, filtros);

/** Suma y cuenta pagos que cumplen los filtros (en el servidor, sin descargarlos) */
async function sumar(filtros: [string, unknown][]): Promise<{ monto: number; n: number }> {
  if (!firebaseListo || !db) {
    const l = demoPagos.filter((p) => filtros.every(([c, v]) => (p as unknown as Record<string, unknown>)[c] === v));
    return { monto: l.reduce((s, p) => s + p.monto, 0), n: l.length };
  }
  const r = await getAggregateFromServer(query(coleccion("pagos"), ...filtros.map(([c, v]) => where(c, "==", v))), { monto: sum("monto"), n: count() });
  return { monto: r.data().monto ?? 0, n: r.data().n };
}

export async function totalesPagos() {
  const app: [string, unknown][] = [["canal", "app"], ["estado", "pagado"]];
  const [enApp, eu, pendientes, ...porConcepto] = await Promise.all([
    sumar(app),
    sumar([["compradorTipo", "paisano"], ["estado", "pagado"]]),
    sumar([["estado", "pendiente"]]),
    ...(Object.keys(CONCEPTOS) as Concepto[]).map((c) => sumar([...app, ["concepto", c]])),
  ]);
  const conceptos = Object.fromEntries((Object.keys(CONCEPTOS) as Concepto[]).map((c, i) => [c, porConcepto[i]])) as Record<Concepto, { monto: number; n: number }>;
  return { enApp, eu, pendientes, conceptos, municipales: { monto: enApp.monto - conceptos.boleto.monto, n: enApp.n - conceptos.boleto.n } };
}

/* ─── Compra simulada (pase digital con QR) ─────────────────
   Recorre el mismo flujo que hará la app: elegir evento y zona, pagar y
   recibir el pase con QR. No mueve dinero: queda marcada `simulado` y fuera
   de los totales de venta. Con la pasarela real, esto lo hace una Cloud
   Function al confirmar el cobro. */

export interface Comprador { nombre: string; colonia: string; tipo: "local" | "paisano"; origen: string | null }

const referenciaPago = (metodo: MetodoPago) => metodo === "oxxo"
  ? Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join("")
  : `646180${Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("")}`;

export async function comprarSimulado(e: Evento, zona: Zona, cantidad: number, comprador: Comprador, metodo: Exclude<MetodoPago, "taquilla">, autor: string): Promise<Pago> {
  const folio = await siguienteFolio("boletos", "TEC", 20000);
  const inmediato = metodo === "tarjeta";
  const pago = await crear("pagos", demoPagos, {
    folio, uid: null, concepto: "boleto", descripcion: `${e.titulo} · ${zona.nombre}`,
    monto: zona.precio * cantidad, moneda: "MXN", metodo, canal: "simulacion", simulado: true,
    estado: inmediato ? "pagado" : "pendiente", ...(inmediato ? {} : { referencia: referenciaPago(metodo) }),
    creadoEn: new Date(), eventoId: e.id, zona: zona.nombre, cantidad, usado: false, usadoEn: null,
    compradorNombre: comprador.nombre, compradorColonia: comprador.colonia, compradorTipo: comprador.tipo, compradorOrigen: comprador.origen,
  });
  await registrar("Simuló compra de boletos", `${folio} · ${e.titulo} · ${cantidad} × ${zona.nombre} · ${METODOS[metodo]}`, "interno", autor);
  return pago;
}

/** Simula que la ficha de OXXO o la transferencia ya se pagó */
export async function simularPagoRecibido(p: Pago, autor: string) {
  await actualizar("pagos", demoPagos, p.id!, { estado: "pagado" });
  await registrar("Simuló pago recibido", `${p.folio} · ${METODOS[p.metodo]}`, "interno", autor);
}

export const buscarPorFolio = async (folio: string) =>
  (await leer("pagos", demoPagos.filter((p) => p.folio === folio), { filtros: [["folio", folio]], max: 1 }))[0] ?? null;

/** Renglones validados del importador CSV → eventos de la feria (crea o actualiza por id) */
export function importarEventos(filas: Record<string, unknown>[]) {
  return guardarVarios("eventos", demoEventos, filas.map((x) => {
    const precio = Number(x.precio ?? 0), cupo = Number(x.cupo ?? 0);
    return { id: aSlug(`${x.fecha}-${x.artista}`), datos: {
      titulo: String(x.artista), categoria: (x.categoria as CategoriaEvento) ?? "concierto", escenario: String(x.lugar ?? ""),
      fecha: String(x.fecha), hora: String(x.hora ?? ""), descripcion: "", transmitir: false, publicado: true,
      zonas: precio > 0 ? [{ nombre: "General", precio, cupo }] : [],
      // Formato que ya lee la app (artista, lugar, precio, disponible)
      artista: String(x.artista), lugar: String(x.lugar ?? ""), precio, disponible: true,
    } as Partial<Evento> };
  }));
}
