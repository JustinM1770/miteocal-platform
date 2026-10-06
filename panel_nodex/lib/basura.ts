import { firebaseListo } from "./firebase";
import { registrar } from "./datos";
import { actualizar, crear, leer } from "./almacen";
import { CENTRO, type Punto } from "./mapas";

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

const p = (dLng: number, dLat: number): Punto => ({ lng: CENTRO.lng + dLng, lat: CENTRO.lat + dLat });

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

export const listarRutas = () => leer("rutasBasura", demoRutas);

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
