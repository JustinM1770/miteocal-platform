import { firebaseListo } from "./firebase";
import { registrar } from "./datos";
import { actualizar, crear, leer } from "./almacen";
import { type Punto } from "./mapas";

/* ─── Rutas del camión de basura ────────────────────────────
   Se configuran desde cero en el mapa: puntos por donde pasa (la
   ruta se ajusta a las calles), días, horario y unidad. Con el
   trazo y el horario, la app calcula a qué hora pasa por cada
   calle («Llega ~7:25»).
   ───────────────────────────────────────────────────────── */

export const DIAS = ["L", "M", "X", "J", "V", "S", "D"] as const;
export const COLORES_RUTA = ["#1552e0", "#12a150", "#c77700", "#6b3db8", "#d93a3a", "#0e7490"];

export interface RutaBasura {
  id?: string;
  nombre: string;
  unidad: string;
  chofer: string;
  color: string;
  dias: string[];
  inicio: string;
  fin: string;
  colonias: string[];
  /** puntos que marcó el operador, en orden */
  puntos: Punto[];
  /** recorrido ajustado a las calles */
  trazo: Punto[];
  metros: number;
  activa: boolean;
}

// Rutas de ejemplo alrededor del centro del municipio demo
const p = (dLng: number, dLat: number): Punto => ({ lng: -102.5764 + dLng, lat: 21.4271 + dLat });

const demoRutas: RutaBasura[] = firebaseListo ? [] : [
  {
    id: "rb1", nombre: "Ruta Centro", unidad: "Unidad 04", chofer: "Martín R.", color: COLORES_RUTA[0], dias: ["M", "V"],
    inicio: "07:00", fin: "09:30", colonias: ["Teocaltiche Centro"], activa: true, trazo: [], metros: 0,
    puntos: [p(-0.004, 0.003), p(0.0, 0.003), p(0.003, 0.002), p(0.003, -0.001), p(0.0, -0.002), p(-0.004, -0.002), p(-0.004, 0.001)],
  },
  {
    id: "rb2", nombre: "Ruta San Miguel Norte", unidad: "Unidad 02", chofer: "Ramón G.", color: COLORES_RUTA[1], dias: ["L", "J"],
    inicio: "08:00", fin: "10:00", colonias: ["San Miguel Norte", "El Santuario"], activa: true, trazo: [], metros: 0,
    puntos: [p(0.004, 0.004), p(0.008, 0.005), p(0.010, 0.002), p(0.007, 0.0), p(0.004, 0.001)],
  },
];

/* Transporte público local: mismas piezas que la basura (trazo por calles,
   días y horario), en su propia colección. */
const demoTransporte: RutaBasura[] = firebaseListo ? [] : [
  {
    id: "tp1", nombre: "Ruta 1 · Centro – Lomas", unidad: "Camión urbano 1", chofer: "Cada 20 min", color: COLORES_RUTA[3], dias: ["L", "M", "X", "J", "V", "S"],
    inicio: "06:00", fin: "21:00", colonias: ["Teocaltiche Centro", "Lomas de Teocaltiche"], activa: true, trazo: [], metros: 0,
    puntos: [p(-0.006, 0.0), p(-0.002, 0.001), p(0.002, 0.001), p(0.005, -0.002), p(0.007, -0.005)],
  },
  {
    id: "tp2", nombre: "Ruta 2 · San Miguel – El Santuario", unidad: "Camión urbano 2", chofer: "Cada 30 min", color: COLORES_RUTA[2], dias: ["L", "M", "X", "J", "V", "S", "D"],
    inicio: "06:30", fin: "20:30", colonias: ["San Miguel Norte", "San Miguel Sur", "El Santuario"], activa: true, trazo: [], metros: 0,
    puntos: [p(0.002, 0.007), p(0.001, 0.003), p(-0.001, -0.001), p(-0.003, -0.005)],
  },
];

export type ClaseRuta = "basura" | "transporte";
const COLECCION: Record<ClaseRuta, string> = { basura: "rutasBasura", transporte: "rutasTransporte" };
const NOMBRE: Record<ClaseRuta, string> = { basura: "ruta de basura", transporte: "ruta de transporte" };
const demoDe = (c: ClaseRuta) => (c === "basura" ? demoRutas : demoTransporte);

export const listarRutasDe = (c: ClaseRuta) => leer(COLECCION[c], demoDe(c));
export const listarRutas = () => listarRutasDe("basura");

export async function guardarRutaDe(c: ClaseRuta, r: RutaBasura, autor: string) {
  const detalle = `${r.nombre} · ${r.dias.join(" ")} · ${r.inicio}–${r.fin}`;
  if (r.id) {
    const { id, ...resto } = r;
    await actualizar(COLECCION[c], demoDe(c), id, resto);
    await registrar(`Editó ${NOMBRE[c]}`, detalle, "publico", autor);
  } else {
    await crear(COLECCION[c], demoDe(c), r);
    await registrar(`Creó ${NOMBRE[c]}`, detalle, "publico", autor);
  }
}

export async function guardarRuta(r: RutaBasura, autor: string) {
  if (r.id) {
    const { id, ...resto } = r;
    await actualizar("rutasBasura", demoRutas, id, resto);
    await registrar("Editó ruta de basura", `${r.nombre} · ${r.dias.join(" ")} · ${r.inicio}–${r.fin}`, "publico", autor);
  } else {
    await crear("rutasBasura", demoRutas, r);
    await registrar("Creó ruta de basura", `${r.nombre} · ${r.dias.join(" ")} · ${r.inicio}–${r.fin}`, "publico", autor);
  }
}

/** Letra del día de hoy en el formato de la ruta */
export const hoy = () => DIAS[(new Date().getDay() + 6) % 7];
