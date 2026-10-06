import { firebaseListo } from "./firebase";
import { COLONIAS } from "./datos";
import { actualizar, azar, leer, type Fecha } from "./almacen";

/* ─── Vecinos (CRM) ─────────────────────────────────────────
   Cada persona que se registró en la app (Figma 09–12: registro,
   verificación SMS, colonia detectada). Los paisanos registran la
   colonia de su familia y la ciudad desde donde usan la app.
   ───────────────────────────────────────────────────────── */

export type TipoVecino = "local" | "paisano";

export interface Vecino {
  id?: string;
  nombre: string;
  telefono: string;
  colonia: string;
  tipo: TipoVecino;
  /** ciudad en EE. UU. para paisanos */
  origen: string | null;
  plataforma: "iOS" | "Android";
  notificaciones: boolean;
  registradoEn: Fecha;
  ultimaVez: Fecha;
}

export interface Calificacion {
  id?: string;
  vecinoId: string;
  estrellas: 1 | 2 | 3 | 4 | 5;
  comentario: string;
  version: string;
  creadoEn: Fecha;
  respuesta?: string | null;
}

export const ORIGENES = [
  "Los Ángeles, CA", "Santa Ana, CA", "Fresno, CA", "Chicago, IL", "Aurora, IL",
  "Dallas, TX", "Houston, TX", "Phoenix, AZ", "Denver, CO",
];

const NOMBRES = ["Ana", "Luis", "María", "José", "Rosa", "Juan", "Guadalupe", "Pedro", "Carmen", "Miguel", "Elena", "Jorge", "Patricia", "Francisco", "Laura", "Antonio", "Sofía", "Ricardo", "Teresa", "Alejandro", "Verónica", "Raúl", "Diana", "Fernando", "Claudia", "Héctor", "Martha", "Arturo", "Leticia", "Ramón"];
const APELLIDOS = ["García", "Hernández", "López", "Martínez", "González", "Pérez", "Rodríguez", "Sánchez", "Ramírez", "Torres", "Flores", "Gutiérrez", "Jiménez", "Ruiz", "Villanueva", "Delgado", "Muñoz", "Aguilar", "Castillo", "Mendoza"];
const COMENTARIOS: Record<number, string[]> = {
  5: ["Por fin sé a qué hora vuelve el agua.", "Compré mis boletos de la feria desde Chicago, muy fácil.", "Me avisó del corte un día antes, excelente.", "La transmisión de la quema del castillo se vio perfecto."],
  4: ["Muy útil, falta que salgan más negocios.", "Buena app, a veces tarda en cargar el mapa.", "Me gusta lo del camión de la basura."],
  3: ["Está bien pero el horario del camión no siempre es exacto.", "Quisiera pagar el predial con PayPal."],
  2: ["Reporté un bache hace una semana y sigue igual.", "No me llegan las notificaciones."],
  1: ["No pude registrarme, el SMS nunca llegó."],
};

const hace = (dias: number) => new Date(Date.now() - dias * 86400_000);

function generar() {
  const a = azar(42);
  const vecinos: Vecino[] = [];
  let n = 0;
  for (const c of COLONIAS) {
    for (let i = 0; i < c.vecinos; i++) {
      const paisano = a.r() < 0.24;
      const registro = a.int(1, 240);
      vecinos.push({
        id: `v${++n}`,
        nombre: `${a.de(NOMBRES)} ${a.de(APELLIDOS)} ${a.de(APELLIDOS)[0]}.`,
        telefono: paisano ? `+1 ${a.int(200, 989)} ••• ${a.int(1000, 9999)}` : `346 ••• ${a.int(1000, 9999)}`,
        colonia: c.nombre,
        tipo: paisano ? "paisano" : "local",
        origen: paisano ? a.de(ORIGENES) : null,
        plataforma: a.r() < (paisano ? 0.6 : 0.3) ? "iOS" : "Android",
        notificaciones: a.r() < 0.86,
        registradoEn: hace(registro),
        ultimaVez: hace(Math.min(registro, a.r() < 0.7 ? a.int(0, 3) : a.int(4, 60))),
      });
    }
  }
  const calificaciones: Calificacion[] = [];
  for (const v of vecinos) {
    if (a.r() > 0.34) continue;
    const x = a.r();
    const e = (x < 0.55 ? 5 : x < 0.8 ? 4 : x < 0.9 ? 3 : x < 0.96 ? 2 : 1) as Calificacion["estrellas"];
    calificaciones.push({
      id: `c${calificaciones.length + 1}`, vecinoId: v.id!, estrellas: e,
      comentario: a.r() < 0.45 ? a.de(COMENTARIOS[e]) : "",
      version: a.de(["1.2.0", "1.3.0", "1.3.1"]), creadoEn: hace(a.int(0, 90)), respuesta: null,
    });
  }
  return { vecinos, calificaciones };
}

const demo = firebaseListo ? { vecinos: [], calificaciones: [] } : generar();
export const demoVecinos: Vecino[] = demo.vecinos;
const demoCalificaciones: Calificacion[] = demo.calificaciones;

export const listarVecinos = () => leer("vecinos", demoVecinos);
export const listarCalificaciones = () => leer("calificaciones", demoCalificaciones);

export const responderCalificacion = (c: Calificacion, respuesta: string) =>
  actualizar("calificaciones", demoCalificaciones, c.id!, { respuesta });
