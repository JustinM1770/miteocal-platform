import { MODULOS } from "./modulos";

/* El menú lateral solo lista secciones; las páginas de cada sección
   aparecen como pestañas arriba del contenido. Así el menú no crece
   cada vez que se agrega un módulo. */

export interface Pagina { href: string; nombre: string }
export interface Seccion { nombre: string; paginas: Pagina[]; interno?: boolean; admin?: boolean }

const mod = (slug: string, nombre?: string): Pagina => {
  const m = MODULOS.find((x) => x.slug === slug)!;
  return { href: `/panel/${m.slug}`, nombre: nombre ?? m.nombre };
};

export const SECCIONES: Seccion[] = [
  { nombre: "Escritorio", paginas: [{ href: "/panel", nombre: "Escritorio" }] },
  { nombre: "Servicios", paginas: [
    { href: "/panel/agua", nombre: "Agua" }, mod("cortes", "Cortes"), mod("incidente", "Incidente"),
    mod("basura", "Basura"), mod("cierres", "Cierres y obras"), mod("escuelas"),
  ] },
  { nombre: "Comunidad", paginas: [
    mod("noticias"), mod("parroquia", "Parroquia"), mod("esquelas"), mod("empleo", "Empleo"),
    mod("clasificados"), mod("paisanos"), mod("directorio", "Directorio"),
  ] },
  { nombre: "Feria", paginas: [
    { href: "/panel/feria", nombre: "Resumen" },
    { href: "/panel/feria/programa", nombre: "Programa" },
    { href: "/panel/feria/reinas", nombre: "Reinas" },
    { href: "/panel/feria/hijos-ausentes", nombre: "Hijos Ausentes" },
    { href: "/panel/feria/transmisiones", nombre: "Transmisiones" },
    { href: "/panel/feria/boletos", nombre: "Boletos y taquilla" },
  ] },
  { nombre: "Trámites", paginas: [
    { href: "/panel/tramites", nombre: "Solicitudes" },
    { href: "/panel/tramites/catalogo", nombre: "Catálogo" },
    { href: "/panel/tramites/agenda", nombre: "Agenda de citas" },
  ] },
  { nombre: "Vecinos", paginas: [
    { href: "/panel/crm", nombre: "CRM" },
    { href: "/panel/reportes", nombre: "Reportes" },
    { href: "/panel/pagos", nombre: "Pagos en línea" },
  ] },
  { nombre: "Interno", interno: true, paginas: [mod("avisos-internos", "Avisos"), mod("dependencias", "Dependencias")] },
  { nombre: "Administración", admin: true, paginas: [
    { href: "/panel/colonias", nombre: "Colonias" },
    { href: "/panel/usuarios", nombre: "Usuarios y áreas" },
    { href: "/panel/auditoria", nombre: "Auditoría" },
  ] },
];

export function seccionDe(path: string) {
  for (const s of SECCIONES) {
    const p = s.paginas.find((x) => x.href === path);
    if (p) return { seccion: s, pagina: p };
  }
  return null;
}
