import { firebaseListo } from "./firebase";
import { registrar } from "./datos";
import { actualizar, azar, crear, leer } from "./almacen";
import { aSlug } from "./config";
import { MUNICIPIO_DEMO } from "./demo-municipio";

/* ─── Comercios ─────────────────────────────────────────────
   municipios/{id}/comercios/{slug}. Mismos campos base que el importador
   CSV del admin_panel (nombre, categoria, whatsapp, destacado, aceptaUsd)
   y el mismo id (slug del nombre), para que ambos caminos no dupliquen.
   `calificacion` y `resenas` los calcula la app/Cloud Function.
   ───────────────────────────────────────────────────────── */

export const CATEGORIAS_COMERCIO = ["Restaurantes", "Tiendas", "Salud", "Servicios", "Envíos a EE. UU."];

/** Métricas de un mes (clave AAAA-MM). Las escribe el servidor, nunca el panel:
    ventas/pedidos/ticket los sincroniza la integración con qboard.mx (solo de
    negocios conectados); contactos y visitas los registra la app. */
export interface MetricasMes { ventas?: number; pedidos?: number; ventasUsd?: number; contactos: number; visitas: number }

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
  /* ── Datos para el municipio ── */
  colonia?: string;
  empleados?: number;
  /** con RFC y alta en el SAT */
  formal?: boolean;
  licencia?: { numero: string; vence: string } | null;
  /** tienda en qboard.mx: si existe, de ahí salen ventas y pedidos */
  qboard?: { tienda: string; desde: string } | null;
  metricas?: Record<string, MetricasMes>;
}

/* ─── Indicadores ─── */
export const mesClave = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export function mesesAtras(n: number): string[] {
  const l: string[] = []; const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setMonth(d.getMonth() - i); l.push(mesClave(x)); }
  return l;
}
export type EstadoLicencia = "vigente" | "por-vencer" | "vencida" | "sin-licencia";
export function estadoLicencia(c: Comercio, hoy = new Date()): EstadoLicencia {
  if (!c.licencia?.vence) return "sin-licencia";
  const dias = (+new Date(`${c.licencia.vence}T12:00`) - +hoy) / 86400_000;
  return dias < 0 ? "vencida" : dias <= 30 ? "por-vencer" : "vigente";
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

/* Padrón de ejemplo: negocios generados con nombres genéricos (no son negocios
   reales) para que los indicadores tengan con qué mostrarse en la demo. */
function padronDemo(): Comercio[] {
  const r = azar(2026);
  const giros: [string, string[]][] = [
    ["Restaurantes", ["Fonda", "Cenaduría", "Taquería", "Lonchería", "Pozolería", "Mariscos", "Cafetería", "Antojitos"]],
    ["Tiendas", ["Abarrotes", "Papelería", "Ferretería", "Zapatería", "Boutique", "Mueblería", "Tlapalería", "Dulcería"]],
    ["Salud", ["Consultorio", "Farmacia", "Óptica", "Dental", "Laboratorio"]],
    ["Servicios", ["Estética", "Taller mecánico", "Lavandería", "Cerrajería", "Imprenta", "Barbería"]],
    ["Envíos a EE. UU.", ["Paquetería", "Regalos", "Florería", "Artesanías"]],
  ];
  const apellidos = ["Ramírez", "Torres", "Aguilar", "Muñoz", "Delgado", "Flores", "López", "Castillo", "Mendoza", "Ruiz", "Gutiérrez", "Jiménez"];
  const colonias = MUNICIPIO_DEMO.colonias.map((x) => x.nombre);
  const meses = mesesAtras(6);
  const l: Comercio[] = [];
  for (let i = 0; i < 64; i++) {
    const [categoria, tipos] = r.de(giros);
    const nombre = `${r.de(tipos)} ${r.de(apellidos)}${i % 7 === 0 ? " e Hijos" : ""}`;
    if (l.some((x) => x.nombre === nombre)) continue;
    const enQboard = r.r() < (categoria === "Envíos a EE. UU." ? 0.7 : 0.32);
    const tamano = r.r();
    const base = enQboard ? Math.round((tamano < 0.6 ? 8000 : tamano < 0.9 ? 25000 : 70000) * (0.7 + r.r() * 0.6)) : 0;
    const vence = new Date(); vence.setDate(vence.getDate() + r.int(-90, 330));
    l.push(c(nombre, categoria, {
      whatsapp: r.r() < 0.8 ? `+52346${r.int(1000000, 9999999)}` : "",
      colonia: r.r() < 0.45 ? "Teocaltiche Centro" : r.de(colonias),
      empleados: tamano < 0.6 ? r.int(1, 3) : tamano < 0.9 ? r.int(3, 8) : r.int(8, 25),
      formal: r.r() < 0.62,
      licencia: r.r() < 0.78 ? { numero: `LF-${r.int(1000, 9999)}`, vence: vence.toLocaleDateString("en-CA") } : null,
      aceptaUsd: categoria === "Envíos a EE. UU." || r.r() < 0.15, enviaFamilia: categoria === "Envíos a EE. UU.",
      calificacion: +(3.6 + r.r() * 1.4).toFixed(1), resenas: r.int(2, 180),
      qboard: enQboard ? { tienda: `https://qboard.mx/${aSlug(nombre)}`, desde: `2026-0${r.int(1, 8)}-01` } : null,
      metricas: Object.fromEntries(meses.map((m, k) => {
        const crece = 1 + k * (enQboard ? 0.06 : 0.02);
        const ventas = enQboard ? Math.round(base * crece * (0.85 + r.r() * 0.3)) : undefined;
        return [m, {
          contactos: Math.round(r.int(3, 40) * crece * (enQboard ? 1.6 : 1)), visitas: Math.round(r.int(20, 260) * crece),
          ...(enQboard ? { ventas, pedidos: Math.max(1, Math.round((ventas ?? 0) / r.int(180, 420))), ventasUsd: categoria === "Envíos a EE. UU." ? Math.round((ventas ?? 0) * 0.6 / 17.5) : 0 } : {}),
        }];
      })),
    }));
  }
  return l;
}
if (!firebaseListo) demoComercios.push(...padronDemo());

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
