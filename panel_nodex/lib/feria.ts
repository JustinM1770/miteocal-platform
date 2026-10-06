import { firebaseListo } from "./firebase";
import { registrar } from "./datos";
import { actualizar, azar, crear, f, leer, type Fecha } from "./almacen";
import { demoVecinos, ORIGENES } from "./vecinos";

/* ─── Feria ─────────────────────────────────────────────────
   Programa, certámenes, Hijos Ausentes, transmisiones y venta de
   boletos (Figma 05 · Feria y 06 · Paisanos). Los pagos están
   simulados: el panel deja todo listo para conectar la pasarela.
   ───────────────────────────────────────────────────────── */

export const FERIA = { nombre: "Feria de Noviembre 2026", inicio: "2026-11-01", fin: "2026-11-16" };

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

export const ESCENARIOS = ["Palenque", "Teatro del Pueblo", "Plaza de Toros", "Parroquia de San Miguel", "Lienzo Charro", "Plaza principal"];

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
}

export interface EstadoCertamen {
  id?: string;
  certamen: Certamen;
  votacionAbierta: boolean;
  cierraEn: string;
  ganadoraId: string | null;
}

/** Un voto por vecino verificado por SMS y por certamen */
export interface Voto { id?: string; vecinoId: string; certamen: Certamen; candidataId: string; creadoEn: Fecha }

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
  vecinoId: string | null;
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
  vecinoId: string | null;
  concepto: Concepto;
  descripcion: string;
  monto: number;
  moneda: "MXN" | "USD";
  metodo: MetodoPago;
  canal: "app" | "taquilla";
  estado: EstadoPago;
  creadoEn: Fecha;
  /* solo boletos */
  eventoId?: string;
  zona?: string;
  cantidad?: number;
  usado?: boolean;
  usadoEn?: Fecha | null;
}

/* ─── Datos demo ────────────────────────────────────────── */

const ev = (id: string, titulo: string, categoria: CategoriaEvento, escenario: string, fecha: string, hora: string, descripcion: string, zonas: Zona[] = [], transmitir = false): Evento =>
  ({ id, titulo, categoria, escenario, fecha, hora, descripcion, zonas, transmitir, publicado: true });

const EVENTOS: Evento[] = [
  ev("e1", "Banda El Recodo", "concierto", "Plaza de Toros", "2026-11-01", "22:00", "Inauguración de la feria.", [{ nombre: "General", precio: 450, cupo: 1800 }, { nombre: "Preferente", precio: 800, cupo: 600 }, { nombre: "VIP", precio: 1500, cupo: 150 }], true),
  ev("e2", "Coronación de la Reina de la Feria", "certamen", "Teatro del Pueblo", "2026-11-01", "20:00", "Coronación y desfile de candidatas.", [], true),
  ev("e3", "Christian Nodal", "concierto", "Plaza de Toros", "2026-11-03", "22:00", "", [{ nombre: "General", precio: 890, cupo: 1800 }, { nombre: "Preferente", precio: 1400, cupo: 600 }, { nombre: "VIP", precio: 2500, cupo: 150 }], true),
  ev("e4", "Corrida de toros · Gran Feria", "toros", "Plaza de Toros", "2026-11-04", "16:30", "Cartel con tres matadores.", [{ nombre: "Sol", precio: 350, cupo: 1500 }, { nombre: "Sombra", precio: 600, cupo: 900 }]),
  ev("e5", "Pepe Aguilar", "concierto", "Plaza de Toros", "2026-11-05", "21:30", "", [{ nombre: "General", precio: 750, cupo: 1800 }, { nombre: "Preferente", precio: 1200, cupo: 600 }], true),
  ev("e6", "Misa de Hijos Ausentes", "religioso", "Parroquia de San Miguel", "2026-11-06", "10:00", "Misa por los paisanos que regresan."),
  ev("e7", "Desfile de Hijos Ausentes", "hijos_ausentes", "Plaza principal", "2026-11-06", "12:00", "Peregrinación de paisanos por la calle Hidalgo.", [], true),
  ev("e8", "Coronación de Miss Chiquitita", "certamen", "Teatro del Pueblo", "2026-11-07", "18:00", "Certamen infantil."),
  ev("e9", "Jaripeo baile", "toros", "Lienzo Charro", "2026-11-08", "17:00", "", [{ nombre: "General", precio: 250, cupo: 1200 }]),
  ev("e10", "Palenque · Pelea de gallos", "palenque", "Palenque", "2026-11-09", "21:00", "", [{ nombre: "General", precio: 300, cupo: 700 }, { nombre: "Ruedo", precio: 700, cupo: 120 }]),
  ev("e11", "Ballet folclórico de Jalisco", "cultural", "Teatro del Pueblo", "2026-11-10", "19:00", "Entrada libre."),
  ev("e12", "Kermés infantil y juegos", "infantil", "Plaza principal", "2026-11-11", "16:00", "Lotería, jaripeo de becerros y payasos."),
  ev("e13", "Procesión de San Miguel", "religioso", "Parroquia de San Miguel", "2026-11-15", "18:00", "", [], true),
  ev("e14", "Quema del Castillo", "religioso", "Parroquia de San Miguel", "2026-11-15", "22:00", "Cierre con fuegos artificiales.", [], true),
];

const CANDIDATAS: Candidata[] = [
  { id: "k1", certamen: "reina", nombre: "Daniela Ramírez", edad: 19, representa: "Teocaltiche Centro", semblanza: "Estudiante de enfermería, voluntaria en Cruz Roja.", color: "#f6d5e4" },
  { id: "k2", certamen: "reina", nombre: "Valeria Torres", edad: 21, representa: "San Miguel Norte", semblanza: "Bailarina del ballet folclórico municipal.", color: "#dfe7fb" },
  { id: "k3", certamen: "reina", nombre: "Ximena Delgado", edad: 18, representa: "El Tanque", semblanza: "Charra, campeona estatal de escaramuza.", color: "#fde8cf" },
  { id: "k4", certamen: "reina", nombre: "Fernanda Aguilar", edad: 20, representa: "Hijos Ausentes · Chicago", semblanza: "Nació en Chicago, sus papás son de El Santuario.", color: "#dcf2e4" },
  { id: "k5", certamen: "miss_chiquitita", nombre: "Regina López", edad: 6, representa: "Bellavista", semblanza: "Le gusta cantar y bailar jarabe.", color: "#f6d5e4" },
  { id: "k6", certamen: "miss_chiquitita", nombre: "Camila Flores", edad: 7, representa: "Teocaltiche Centro", semblanza: "Primaria Benito Juárez, 2º grado.", color: "#ece4fb" },
  { id: "k7", certamen: "miss_chiquitita", nombre: "Renata Muñoz", edad: 5, representa: "El Santuario", semblanza: "Jardín de Niños Rosaura Zapata.", color: "#fde8cf" },
];

const hace = (dias: number, horas = 0) => new Date(Date.now() - dias * 86400_000 - horas * 3600_000);

function generar() {
  const a = azar(7);
  const votos: Voto[] = [];
  const pesoReina = [0.34, 0.27, 0.17, 0.22];
  const pesoMiss = [0.41, 0.33, 0.26];
  const elegir = (p: number[]) => { let x = a.r(); for (let i = 0; i < p.length; i++) { x -= p[i]; if (x <= 0) return i; } return p.length - 1; };
  for (const v of demoVecinos) {
    if (a.r() < 0.58) votos.push({ id: `vr${v.id}`, vecinoId: v.id!, certamen: "reina", candidataId: CANDIDATAS[elegir(pesoReina)].id!, creadoEn: hace(a.int(0, 20)) });
    if (a.r() < 0.41) votos.push({ id: `vm${v.id}`, vecinoId: v.id!, certamen: "miss_chiquitita", candidataId: CANDIDATAS[4 + elegir(pesoMiss)].id!, creadoEn: hace(a.int(0, 20)) });
  }

  const pagos: Pago[] = [];
  let folio = 8000;
  const conBoletos = EVENTOS.filter((e) => e.zonas.length);
  // Boletos: los paisanos compran más y casi siempre con tarjeta
  for (const v of demoVecinos) {
    const compras = v.tipo === "paisano" ? (a.r() < 0.55 ? a.int(1, 3) : 0) : (a.r() < 0.28 ? a.int(1, 2) : 0);
    for (let i = 0; i < compras; i++) {
      const e = a.de(conBoletos);
      const z = a.r() < 0.6 ? e.zonas[0] : a.de(e.zonas);
      const cantidad = a.int(1, 4);
      const metodo: MetodoPago = v.tipo === "paisano" ? (a.r() < 0.9 ? "tarjeta" : "spei") : a.de(["tarjeta", "tarjeta", "oxxo", "spei"] as const);
      const estado: EstadoPago = metodo === "oxxo" && a.r() < 0.25 ? "pendiente" : a.r() < 0.03 ? "reembolsado" : "pagado";
      pagos.push({
        id: `p${++folio}`, folio: `TEC-${folio}`, vecinoId: v.id!, concepto: "boleto",
        descripcion: `${e.titulo} · ${z.nombre}`, monto: z.precio * cantidad, moneda: "MXN",
        metodo, canal: "app", estado, creadoEn: hace(a.int(0, 24), a.int(0, 23)),
        eventoId: e.id, zona: z.nombre, cantidad, usado: false, usadoEn: null,
      });
    }
    // Pagos municipales desde la app
    if (a.r() < 0.18) pagos.push({ id: `p${++folio}`, folio: `TEC-${folio}`, vecinoId: v.id!, concepto: "agua", descripcion: `Agua · ${v.colonia} · bimestre 5`, monto: a.int(180, 420), moneda: "MXN", metodo: a.de(["tarjeta", "oxxo", "spei"] as const), canal: "app", estado: "pagado", creadoEn: hace(a.int(0, 40)) });
    if (v.tipo === "paisano" && a.r() < 0.3) pagos.push({ id: `p${++folio}`, folio: `TEC-${folio}`, vecinoId: v.id!, concepto: "predial", descripcion: `Predial 2026 · ${v.colonia}`, monto: a.int(900, 3200), moneda: "MXN", metodo: "tarjeta", canal: "app", estado: "pagado", creadoEn: hace(a.int(0, 60)) });
    if (a.r() < 0.04) pagos.push({ id: `p${++folio}`, folio: `TEC-${folio}`, vecinoId: v.id!, concepto: "acta", descripcion: "Acta de nacimiento certificada", monto: 160, moneda: "MXN", metodo: "tarjeta", canal: "app", estado: "pagado", creadoEn: hace(a.int(0, 60)) });
  }
  // Ventas en taquilla, sin cuenta en la app
  for (let i = 0; i < 90; i++) {
    const e = a.de(conBoletos); const z = e.zonas[0]; const cantidad = a.int(1, 5);
    pagos.push({ id: `p${++folio}`, folio: `TEC-${folio}`, vecinoId: null, concepto: "boleto", descripcion: `${e.titulo} · ${z.nombre}`, monto: z.precio * cantidad, moneda: "MXN", metodo: "taquilla", canal: "taquilla", estado: "pagado", creadoEn: hace(a.int(0, 15), a.int(0, 10)), eventoId: e.id, zona: z.nombre, cantidad, usado: false, usadoEn: null });
  }

  const paisanos = demoVecinos.filter((v) => v.tipo === "paisano");
  const registros: RegistroPaisano[] = paisanos.filter(() => a.r() < 0.45).map((v, i) => ({
    id: `h${i + 1}`, vecinoId: v.id!, nombre: v.nombre, origen: v.origen ?? a.de(ORIGENES),
    llega: `2026-11-0${a.int(1, 6)}`, personas: a.int(1, 6), desfile: a.r() < 0.6,
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

export const listarEventos = async () =>
  (await leer("eventos", demoEventos)).sort((x, y) => `${x.fecha}${x.hora}`.localeCompare(`${y.fecha}${y.hora}`));
export const listarCandidatas = () => leer("candidatas", demoCandidatas);
export const listarCertamenes = () => leer("certamenes", demoCertamenes);
export const listarVotos = () => leer("votos", demoVotos);
export const listarTransmisiones = () => leer("transmisiones", demoTransmisiones);
export const listarRegistrosPaisanos = () => leer("registrosPaisanos", demoRegistros);
export const listarPagos = async () =>
  (await leer("pagos", demoPagos)).sort((x, y) => +f(y.creadoEn) - +f(x.creadoEn));

/** Boletos vendidos por evento y zona (cuenta solo pagados) */
export function vendidos(pagos: Pago[], eventoId: string, zona?: string) {
  return pagos
    .filter((p) => p.concepto === "boleto" && p.estado === "pagado" && p.eventoId === eventoId && (!zona || p.zona === zona))
    .reduce((s, p) => s + (p.cantidad ?? 0), 0);
}

/* ─── Escrituras ────────────────────────────────────────── */

export async function guardarEvento(e: Omit<Evento, "id">, autor: string) {
  const nuevo = await crear("eventos", demoEventos, e);
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

export async function cambiarTransmision(t: Transmision, estado: EstadoTransmision, autor: string) {
  const cambios: Partial<Transmision> = { estado };
  if (estado === "en_vivo") { cambios.inicio = new Date(); cambios.espectadores = 0; }
  if (estado === "terminada") cambios.espectadores = 0;
  await actualizar("transmisiones", demoTransmisiones, t.id!, cambios);
  await registrar(estado === "en_vivo" ? "Inició transmisión" : "Terminó transmisión", t.titulo, "publico", autor);
}

export async function validarBoleto(p: Pago, autor: string) {
  await actualizar("pagos", demoPagos, p.id!, { usado: true, usadoEn: new Date() });
  await registrar("Validó boleto en la entrada", `${p.folio} · ${p.descripcion}`, "interno", autor);
}

export async function reembolsar(p: Pago, autor: string) {
  await actualizar("pagos", demoPagos, p.id!, { estado: "reembolsado" });
  await registrar("Reembolsó pago", `${p.folio} · ${p.descripcion}`, "interno", autor);
}

export async function venderTaquilla(e: Evento, zona: Zona, cantidad: number, autor: string) {
  const folio = `TEC-${Math.floor(10000 + Math.random() * 89999)}`;
  await crear("pagos", demoPagos, {
    folio, vecinoId: null, concepto: "boleto", descripcion: `${e.titulo} · ${zona.nombre}`,
    monto: zona.precio * cantidad, moneda: "MXN", metodo: "taquilla", canal: "taquilla", estado: "pagado",
    creadoEn: new Date(), eventoId: e.id, zona: zona.nombre, cantidad, usado: false, usadoEn: null,
  });
  await registrar("Vendió boletos en taquilla", `${folio} · ${e.titulo} · ${cantidad} × ${zona.nombre}`, "interno", autor);
  return folio;
}
