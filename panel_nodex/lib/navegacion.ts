import { MODULOS } from "./modulos";
import type { Modulo } from "./config";

/* El menú lateral solo lista secciones; las páginas de cada sección
   aparecen como pestañas arriba del contenido. Así el menú no crece
   cada vez que se agrega un módulo.

   `modulo`: la página se oculta si el municipio tiene ese módulo apagado.
   `admin`: solo administradores (datos personales o configuración). */

export interface Pagina { href: string; nombre: string; modulo?: Modulo; admin?: boolean }
export interface Seccion { nombre: string; paginas: Pagina[]; interno?: boolean }

const mod = (slug: string, nombre?: string, modulo?: Modulo): Pagina => {
  const m = MODULOS.find((x) => x.slug === slug)!;
  return { href: `/panel/${m.slug}`, nombre: nombre ?? m.nombre, modulo };
};

export const SECCIONES: Seccion[] = [
  { nombre: "Escritorio", paginas: [{ href: "/panel", nombre: "Escritorio" }] },
  { nombre: "Servicios", paginas: [
    { href: "/panel/agua", nombre: "Agua", modulo: "agua" }, mod("cortes", "Cortes", "agua"), mod("incidente", "Incidente", "agua"),
    { href: "/panel/basura", nombre: "Basura", modulo: "basura" }, mod("cierres", "Cierres y obras"),
    { href: "/panel/planteles", nombre: "Escuelas", modulo: "escuelas" }, mod("escuelas", "Avisos escolares", "escuelas"),
    { href: "/panel/directorio", nombre: "Emergencias" },
  ] },
  { nombre: "Comunidad", paginas: [
    mod("noticias", undefined, "noticias"), mod("parroquia", "Parroquia", "noticias"), mod("esquelas", undefined, "noticias"),
    mod("paisanos", undefined, "paisanos"),
  ] },
  { nombre: "Comercio", paginas: [
    { href: "/panel/comercios", nombre: "Comercios", modulo: "comercio" },
    mod("empleo", "Empleo", "comercio"), mod("clasificados", undefined, "comercio"),
  ] },
  { nombre: "Feria", paginas: [
    { href: "/panel/feria", nombre: "Resumen", modulo: "feria" },
    { href: "/panel/feria/programa", nombre: "Programa", modulo: "feria" },
    { href: "/panel/feria/reinas", nombre: "Reinas", modulo: "feria" },
    { href: "/panel/feria/hijos-ausentes", nombre: "Hijos Ausentes", modulo: "feria" },
    { href: "/panel/feria/transmisiones", nombre: "Transmisiones", modulo: "feria" },
    { href: "/panel/feria/boletos", nombre: "Boletos y taquilla", modulo: "feria" },
  ] },
  { nombre: "Trámites", paginas: [
    { href: "/panel/tramites", nombre: "Solicitudes", modulo: "tramites" },
    { href: "/panel/tramites/catalogo", nombre: "Catálogo", modulo: "tramites" },
    { href: "/panel/tramites/agenda", nombre: "Agenda de citas", modulo: "tramites" },
  ] },
  { nombre: "Vecinos", paginas: [
    { href: "/panel/reportes", nombre: "Reportes", modulo: "reportes" },
    { href: "/panel/crm", nombre: "CRM", admin: true },
    { href: "/panel/pagos", nombre: "Pagos en línea" },
  ] },
  { nombre: "Interno", interno: true, paginas: [mod("avisos-internos", "Avisos"), mod("dependencias", "Dependencias")] },
  { nombre: "Administración", paginas: [
    { href: "/panel/colonias", nombre: "Colonias y barrios", admin: true },
    { href: "/panel/municipio", nombre: "Municipio", admin: true },
    { href: "/panel/usuarios", nombre: "Personal", admin: true },
    { href: "/panel/auditoria", nombre: "Auditoría", admin: true },
  ] },
];

/** Secciones con solo las páginas que esta persona y este municipio pueden ver */
export function seccionesVisibles(esAdmin: boolean, activo: (m: Modulo) => boolean): Seccion[] {
  return SECCIONES
    .map((s) => ({ ...s, paginas: s.paginas.filter((p) => (!p.admin || esAdmin) && (!p.modulo || activo(p.modulo))) }))
    .filter((s) => s.paginas.length > 0);
}

export function paginaDe(path: string): Pagina | null {
  for (const s of SECCIONES) {
    const p = s.paginas.find((x) => x.href === path);
    if (p) return p;
  }
  return null;
}
