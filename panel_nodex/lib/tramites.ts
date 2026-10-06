import { firebaseListo } from "./firebase";
import { registrar } from "./datos";
import { actualizar, azar, crear, f, leer, type Fecha } from "./almacen";
import { demoVecinos } from "./vecinos";

/* ─── Trámites y citas ──────────────────────────────────────
   Para lo que solo se resuelve en el municipio (Registro Civil,
   DIF, Catastro…): el vecino ve requisitos, sube documentos, paga
   y agenda desde la app, y va UNA vez a recoger o a firmar.
   ───────────────────────────────────────────────────────── */

export const DEPENDENCIAS = ["Registro Civil", "DIF", "Catastro", "Tesorería", "Secretaría General"] as const;
export type Dependencia = (typeof DEPENDENCIAS)[number];

export type Modalidad = "en_linea" | "cita" | "mixta";
export const MODALIDADES: Record<Modalidad, { nombre: string; ayuda: string }> = {
  en_linea: { nombre: "En línea", ayuda: "Se resuelve sin ir; el documento llega a la app." },
  mixta: { nombre: "Solicitud en línea + recoger", ayuda: "Se pide y paga en la app; se recoge en la oficina." },
  cita: { nombre: "Con cita", ayuda: "Requiere presencia (firma, entrevista, ceremonia)." },
};

export interface Tramite {
  id?: string;
  dependencia: Dependencia;
  nombre: string;
  descripcion: string;
  requisitos: string[];
  /** 0 = gratuito */
  costo: number;
  pagoEnLinea: boolean;
  modalidad: Modalidad;
  /** días hábiles para tenerlo listo */
  dias: number;
  /** un familiar puede recogerlo con carta poder o se envía por paquetería */
  paraPaisanos: boolean;
  activo: boolean;
}

export interface Agenda {
  id?: string;
  dependencia: Dependencia;
  /** 0 = domingo … 6 = sábado */
  dias: number[];
  inicio: string;
  fin: string;
  minutos: number;
  /** ventanillas atendiendo a la vez */
  ventanillas: number;
  inhabiles: string[];
}

export type EstadoSolicitud = "recibida" | "en_revision" | "falta_documento" | "lista" | "entregada" | "rechazada";
export const ESTADOS: Record<EstadoSolicitud, { nombre: string; color: string; aviso: string }> = {
  recibida: { nombre: "Recibida", color: "gris", aviso: "Recibimos tu solicitud." },
  en_revision: { nombre: "En revisión", color: "azul", aviso: "Estamos revisando tus documentos." },
  falta_documento: { nombre: "Falta un documento", color: "naranja", aviso: "Necesitamos que corrijas o subas un documento." },
  lista: { nombre: "Lista para recoger", color: "verde", aviso: "Tu trámite está listo. Pasa por él con tu folio." },
  entregada: { nombre: "Entregada", color: "morado", aviso: "Trámite entregado." },
  rechazada: { nombre: "Rechazada", color: "rojo", aviso: "Tu solicitud no procede." },
};
export const FLUJO: EstadoSolicitud[] = ["recibida", "en_revision", "falta_documento", "lista", "entregada"];

export type Entrega = "oficina" | "familiar" | "paqueteria";
export const ENTREGAS: Record<Entrega, string> = { oficina: "Recoge en la oficina", familiar: "Recoge un familiar con carta poder", paqueteria: "Envío por paquetería" };

export interface Documento { nombre: string; url: string | null; estado: "pendiente" | "aceptado" | "rechazado"; motivo?: string }
export interface Nota { texto: string; autor: string; fecha: Fecha; /** visible para el vecino en la app */ publica: boolean }

export interface Solicitud {
  id?: string;
  folio: string;
  tramiteId: string;
  tramite: string;
  dependencia: Dependencia;
  vecinoId: string | null;
  vecinoNombre: string;
  telefono: string;
  canal: "app" | "ventanilla";
  documentos: Documento[];
  estado: EstadoSolicitud;
  pago: { monto: number; metodo: string; estado: "pagado" | "pendiente" } | null;
  cita: Fecha | null;
  entrega: Entrega;
  notas: Nota[];
  creadoEn: Fecha;
  actualizadoEn: Fecha;
}

/* ─── Catálogo sugerido (cada municipio lo ajusta) ─── */

const t = (dependencia: Dependencia, nombre: string, descripcion: string, requisitos: string[], costo: number, modalidad: Modalidad, dias: number, paraPaisanos = false): Tramite =>
  ({ dependencia, nombre, descripcion, requisitos, costo, pagoEnLinea: costo > 0, modalidad, dias, paraPaisanos, activo: true });

export const CATALOGO_SUGERIDO: Tramite[] = [
  t("Registro Civil", "Copia certificada de acta de matrimonio", "Copia de un matrimonio registrado en este municipio.", ["INE de quien solicita", "Nombres de los contrayentes", "Fecha aproximada del matrimonio"], 160, "mixta", 2, true),
  t("Registro Civil", "Copia certificada de acta de defunción", "Copia de una defunción registrada en este municipio.", ["INE de quien solicita", "Nombre de la persona fallecida", "Fecha aproximada"], 160, "mixta", 2, true),
  t("Registro Civil", "Matrimonio civil", "Celebración del matrimonio en oficina o a domicilio.", ["Actas de nacimiento de ambos", "INE de ambos", "INE de 2 testigos por contrayente", "Certificado médico prenupcial", "Constancia de pláticas prematrimoniales"], 850, "cita", 10),
  t("Registro Civil", "Registro de nacimiento", "Registro de un recién nacido. Primera acta gratuita.", ["Certificado de nacimiento", "INE de mamá y papá", "Acta de matrimonio (si aplica)", "2 testigos con INE"], 0, "cita", 1),
  t("Registro Civil", "Aclaración administrativa de acta", "Corrección de errores de escritura en un acta.", ["Acta con el error", "Documento que pruebe el dato correcto", "INE"], 350, "cita", 15, true),
  t("Secretaría General", "Constancia de residencia", "Para trámites escolares, laborales o migratorios.", ["INE", "Comprobante de domicilio reciente", "2 fotografías tamaño infantil"], 120, "mixta", 1),
  t("Secretaría General", "Constancia de identidad", "Para quien no cuenta con identificación oficial.", ["Acta de nacimiento", "2 testigos con INE", "2 fotografías"], 120, "cita", 1, true),
  t("DIF", "Apoyo alimentario (despensa)", "Despensa mensual para familias en situación vulnerable.", ["INE", "CURP de los integrantes", "Comprobante de domicilio", "Estudio socioeconómico (lo hace el DIF)"], 0, "cita", 10),
  t("DIF", "Terapia en Unidad Básica de Rehabilitación", "Terapia física y de lenguaje.", ["CURP", "Diagnóstico o referencia médica", "INE del tutor si es menor"], 50, "cita", 3),
  t("DIF", "Consulta psicológica", "Atención psicológica individual y familiar.", ["CURP", "INE del tutor si es menor"], 0, "cita", 2),
  t("DIF", "Asesoría jurídica familiar", "Pensión alimenticia, custodia, divorcio.", ["INE", "Actas relacionadas con el caso"], 0, "cita", 2),
  t("Catastro", "Constancia de no adeudo predial", "Para escrituración o venta de inmueble.", ["Número de cuenta predial", "INE del propietario"], 180, "en_linea", 1, true),
  t("Tesorería", "Licencia de funcionamiento (refrendo)", "Renovación anual de la licencia del negocio.", ["Licencia anterior", "RFC", "Comprobante de domicilio del negocio"], 650, "mixta", 5),
];

const AGENDA_BASE = (dependencia: Dependencia): Agenda =>
  ({ dependencia, dias: [1, 2, 3, 4, 5], inicio: "09:00", fin: "14:00", minutos: dependencia === "DIF" ? 45 : 20, ventanillas: dependencia === "Registro Civil" ? 2 : 1, inhabiles: ["2026-11-02", "2026-11-16"] });

/* ─── Datos demo ─── */

const hace = (dias: number, horas = 0) => new Date(Date.now() - dias * 86400_000 - horas * 3600_000);

function semilla() {
  const tramites = CATALOGO_SUGERIDO.map((x, i) => ({ ...x, id: `tr${i + 1}` }));
  const a = azar(11);
  const estados: EstadoSolicitud[] = ["recibida", "recibida", "en_revision", "en_revision", "falta_documento", "lista", "lista", "entregada", "entregada", "rechazada"];
  const solicitudes: Solicitud[] = [];
  for (let i = 0; i < 26; i++) {
    const tr = a.de(tramites);
    const v = a.de(demoVecinos);
    const estado = a.de(estados);
    const dias = a.int(0, 12);
    const cita = tr.modalidad !== "en_linea" && estado !== "rechazada" ? (() => { const d = new Date(); d.setDate(d.getDate() + a.int(-2, 6)); d.setHours(a.int(9, 13), a.de([0, 20, 40]), 0, 0); return d; })() : null;
    solicitudes.push({
      id: `s${i + 1}`, folio: `TRM-${3100 + i}`, tramiteId: tr.id!, tramite: tr.nombre, dependencia: tr.dependencia,
      vecinoId: v?.id ?? null, vecinoNombre: v?.nombre ?? "Vecino", telefono: v?.telefono ?? "", canal: a.r() < 0.85 ? "app" : "ventanilla",
      documentos: tr.requisitos.map((r, k) => ({
        nombre: r, url: null,
        estado: estado === "falta_documento" && k === 0 ? "rechazado" : estado === "recibida" ? "pendiente" : "aceptado",
        motivo: estado === "falta_documento" && k === 0 ? "La foto está borrosa, no se lee la fecha." : undefined,
      })),
      estado,
      pago: tr.costo ? { monto: tr.costo, metodo: v?.tipo === "paisano" ? "Tarjeta" : a.de(["Tarjeta", "OXXO", "Ventanilla"]), estado: a.r() < 0.85 ? "pagado" : "pendiente" } : null,
      cita,
      entrega: v?.tipo === "paisano" && tr.paraPaisanos ? a.de(["familiar", "paqueteria"] as const) : "oficina",
      notas: estado === "falta_documento" ? [{ texto: "La foto de la INE está borrosa, súbela de nuevo por favor.", autor: "Registro Civil", fecha: hace(dias - 1 < 0 ? 0 : dias - 1), publica: true }] : [],
      creadoEn: hace(dias, a.int(0, 8)), actualizadoEn: hace(Math.max(0, dias - 1)),
    });
  }
  return { tramites, solicitudes, agendas: DEPENDENCIAS.map((d, i) => ({ ...AGENDA_BASE(d), id: `ag${i + 1}` })) };
}

const s = firebaseListo ? { tramites: [], solicitudes: [], agendas: [] } : semilla();
const demoTramites: Tramite[] = s.tramites;
const demoSolicitudes: Solicitud[] = s.solicitudes;
const demoAgendas: Agenda[] = s.agendas;

/* ─── Lecturas ─── */

export const listarTramites = async () => (await leer("tramites", demoTramites)).sort((a, b) => a.dependencia.localeCompare(b.dependencia) || a.nombre.localeCompare(b.nombre));
export const listarSolicitudes = async () =>
  (await leer("solicitudes", demoSolicitudes)).sort((a, b) => +f(b.creadoEn) - +f(a.creadoEn));
export async function listarAgendas(): Promise<Agenda[]> {
  const l = await leer("agendas", demoAgendas);
  // Las dependencias sin agenda guardada usan el horario base
  return DEPENDENCIAS.map((d) => l.find((x) => x.dependencia === d) ?? AGENDA_BASE(d));
}

/** Horarios de cita de un día para una dependencia */
export function turnos(ag: Agenda, fecha: Date): Date[] {
  const clave = fecha.toLocaleDateString("en-CA");
  if (!ag.dias.includes(fecha.getDay()) || ag.inhabiles.includes(clave)) return [];
  const [hi, mi] = ag.inicio.split(":").map(Number);
  const [hf, mf] = ag.fin.split(":").map(Number);
  const out: Date[] = [];
  const d = new Date(fecha); d.setHours(hi, mi, 0, 0);
  const fin = new Date(fecha); fin.setHours(hf, mf, 0, 0);
  while (+d + ag.minutos * 60000 <= +fin) { out.push(new Date(d)); d.setMinutes(d.getMinutes() + ag.minutos); }
  return out;
}

/* ─── Escrituras ─── */

export async function guardarTramite(tr: Tramite, autor: string) {
  if (tr.id) {
    const { id, ...resto } = tr;
    await actualizar("tramites", demoTramites, id, resto);
    await registrar("Editó trámite", `${tr.dependencia} · ${tr.nombre}`, "publico", autor);
  } else {
    await crear("tramites", demoTramites, tr);
    await registrar("Agregó trámite", `${tr.dependencia} · ${tr.nombre}`, "publico", autor);
  }
}

export async function usarCatalogoSugerido(existentes: Tramite[], autor: string) {
  const nombres = new Set(existentes.map((x) => x.nombre));
  const nuevos = CATALOGO_SUGERIDO.filter((x) => !nombres.has(x.nombre));
  for (const tr of nuevos) await crear("tramites", demoTramites, tr);
  await registrar("Cargó catálogo de trámites sugerido", `${nuevos.length} trámites`, "publico", autor);
  return nuevos.length;
}

export async function guardarAgenda(ag: Agenda, autor: string) {
  if (ag.id) {
    const { id, ...resto } = ag;
    await actualizar("agendas", demoAgendas, id, resto);
  } else {
    await crear("agendas", demoAgendas, ag);
  }
  await registrar("Cambió horario de citas", `${ag.dependencia} · ${ag.inicio}–${ag.fin}`, "interno", autor);
}

export async function actualizarSolicitud(sol: Solicitud, cambios: Partial<Solicitud>, accion: string, autor: string) {
  await actualizar("solicitudes", demoSolicitudes, sol.id!, { ...cambios, actualizadoEn: new Date() });
  await registrar(accion, `${sol.folio} · ${sol.tramite}`, "publico", autor);
}

export async function solicitudEnVentanilla(tr: Tramite, vecinoNombre: string, telefono: string, cita: Date | null, autor: string) {
  const folio = `TRM-${Math.floor(10000 + Math.random() * 89999)}`;
  await crear("solicitudes", demoSolicitudes, {
    folio, tramiteId: tr.id!, tramite: tr.nombre, dependencia: tr.dependencia, vecinoId: null, vecinoNombre, telefono,
    canal: "ventanilla", documentos: tr.requisitos.map((r) => ({ nombre: r, url: null, estado: "pendiente" })),
    estado: "recibida", pago: tr.costo ? { monto: tr.costo, metodo: "Ventanilla", estado: "pendiente" } : null,
    cita, entrega: "oficina", notas: [], creadoEn: new Date(), actualizadoEn: new Date(),
  });
  await registrar("Registró solicitud en ventanilla", `${folio} · ${tr.nombre}`, "publico", autor);
  return folio;
}
