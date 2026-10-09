import { firebaseListo } from "./firebase";
import { registrar } from "./datos";
import { actualizar, crear, leer } from "./almacen";
import { aSlug } from "./config";

/* ─── Comercios ─────────────────────────────────────────────
   municipios/{id}/comercios/{slug}. Mismos campos base que el importador
   CSV del admin_panel (nombre, categoria, whatsapp, destacado, aceptaUsd)
   y el mismo id (slug del nombre), para que ambos caminos no dupliquen.
   `calificacion` y `resenas` los calcula la app/Cloud Function.
   ───────────────────────────────────────────────────────── */

export const CATEGORIAS_COMERCIO = ["Restaurantes", "Tiendas", "Salud", "Servicios", "Envíos a EE. UU."];

export interface Comercio {
  id?: string;
  nombre: string;
  categoria: string;
  whatsapp: string;
  destacado: boolean;
  aceptaUsd: boolean;
  /** «Envía a tu familia»: entrega a domicilio pagada desde EE. UU. */
  enviaFamilia: boolean;
  direccion: string;
  descripcion: string;
  abre: string;
  cierra: string;
  dias: string[];
  activo: boolean;
  /** imagen en Storage: municipios/{id}/comercios/{slug}/… */
  portada?: string;
  calificacion?: number;
  resenas?: number;
}

const c = (nombre: string, categoria: string, x: Partial<Comercio>): Comercio => ({
  id: aSlug(nombre), nombre, categoria, whatsapp: "", destacado: false, aceptaUsd: false, enviaFamilia: false,
  direccion: "", descripcion: "", abre: "09:00", cierra: "20:00", dias: ["L", "M", "X", "J", "V", "S"], activo: true, ...x,
});

const demoComercios: Comercio[] = firebaseListo ? [] : [
  c("Farmacia San Rafael", "Salud", { whatsapp: "+523461000001", direccion: "Zaragoza 45, Centro", destacado: true, calificacion: 4.8, resenas: 89, abre: "08:00", cierra: "22:00", dias: ["L", "M", "X", "J", "V", "S", "D"] }),
  c("Birriería Don Chuy", "Restaurantes", { whatsapp: "+523461000002", direccion: "Hidalgo 12, Centro", calificacion: 4.6, resenas: 212, abre: "07:00", cierra: "15:00" }),
  c("Tacos Chuy", "Restaurantes", { whatsapp: "+523461000003", direccion: "Morelos 8, San Miguel Norte", calificacion: 4.9, resenas: 212, abre: "19:00", cierra: "23:30" }),
  c("Mercado La Esperanza", "Tiendas", { direccion: "Plaza principal", abre: "06:00", cierra: "16:00", dias: ["L", "M", "X", "J", "V", "S", "D"] }),
  c("Electrónica Ultra", "Envíos a EE. UU.", { whatsapp: "+523461000004", aceptaUsd: true, enviaFamilia: true, descripcion: "Envía amueblamiento completo a tu familia, entrega garantizada." }),
  c("Orez Floristería", "Envíos a EE. UU.", { whatsapp: "+523461000005", aceptaUsd: true, enviaFamilia: true, descripcion: "Arreglos y flores a domicilio. Pago con Zelle o Venmo." }),
];

export const listarComercios = async () => (await leer("comercios", demoComercios)).sort((a, b) => Number(b.destacado) - Number(a.destacado) || a.nombre.localeCompare(b.nombre));

export async function guardarComercio(x: Comercio, autor: string) {
  if (x.id) {
    await actualizar("comercios", demoComercios, x.id, x);
    await registrar("Editó comercio", x.nombre, "publico", autor);
  } else {
    await crear("comercios", demoComercios, x, aSlug(x.nombre));
    await registrar("Agregó comercio", `${x.nombre} · ${x.categoria}`, "publico", autor);
  }
}

/** ¿Está abierto ahora? (hora local del panel) */
export function abiertoAhora(x: Comercio, ahora = new Date()) {
  const dia = ["D", "L", "M", "X", "J", "V", "S"][ahora.getDay()];
  if (!x.dias.includes(dia)) return false;
  const hhmm = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
  return x.cierra > x.abre ? hhmm >= x.abre && hhmm < x.cierra : hhmm >= x.abre || hhmm < x.cierra;
}
