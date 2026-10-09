import type { ConfigMunicipio } from "./config";

/* Municipio de ejemplo para el MODO DEMO (sin .env.local). Con Firebase
   conectado nada de esto se usa: la configuración sale de
   municipios/{id}/config/*. Las cifras de vecinos son estimaciones. */

const centro = "Centro y zonas tradicionales";
const colonias = "Colonias y fraccionamientos";

const LISTA: [string, string, number][] = [
  ["Teocaltiche Centro", centro, 184], ["El Nejayote", centro, 41], ["El Tanque", centro, 37], ["El Santuario", centro, 52],
  ["Bellavista", colonias, 33], ["CTM (Los Órganos)", colonias, 46], ["Colinas de la Cruz", colonias, 28],
  ["San Miguel Norte", colonias, 61], ["San Miguel Sur", colonias, 55], ["Tavares", colonias, 24], ["Los Ángeles", colonias, 31],
  ["Los Arcos", colonias, 22], ["Maravillas", colonias, 27], ["Arboledas", colonias, 19], ["Magisterial", colonias, 26],
  ["San Pedro", colonias, 35], ["Lomas de Teocaltiche", colonias, 18],
];

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const MUNICIPIO_DEMO: ConfigMunicipio = {
  nombre: "Teocaltiche",
  estado: "Jalisco",
  modulos: { agua: true, basura: true, reportes: true, comercio: true, noticias: true, escuelas: true, feria: true, paisanos: true, tramites: true },
  colonias: LISTA.map(([nombre, zona]) => ({ id: slug(nombre), nombre, zona })),
  emergencias: [
    { id: "emergencias", nombre: "Emergencias", telefono: "911", categoria: "Emergencias" },
    { id: "proteccion-civil", nombre: "Protección Civil", telefono: "346 787 0911", categoria: "Emergencias", nota: "Atención 24 horas" },
    { id: "cruz-roja", nombre: "Cruz Roja", telefono: "346 787 0065", categoria: "Salud", nota: "Ambulancias 24 horas" },
    { id: "policia", nombre: "Policía Municipal", telefono: "346 787 0060", categoria: "Seguridad", nota: "Atención 24 horas" },
    { id: "sapas", nombre: "Agua Potable · SAPAS", telefono: "346 787 0220", categoria: "Servicios", nota: "Fugas y falta de agua" },
  ],
  feria: { nombre: "Feria de Noviembre 2026", inicio: "2026-10-30", fin: "2026-11-16" },
  catalogos: {
    escenarios: ["Palenque", "Teatro del Pueblo", "Plaza de Toros", "Parroquia de San Miguel", "Lienzo Charro", "Plaza principal"],
    escuelas: ["CBTIS 247", "Secundaria Federal 20", "Primaria Benito Juárez", "Primaria Rafael Ramírez", "Jardín de Niños Rosaura Zapata"],
    templos: ["Parroquia de San Miguel Arcángel", "Templo de El Señor de Las Maravillas"],
    dependencias: ["Presidencia", "Agua Potable", "Obras Públicas", "Comunicación Social", "Protección Civil", "Registro Civil", "DIF", "Catastro", "Tesorería", "Secretaría General"],
  },
  vecinosPorColonia: Object.fromEntries(LISTA.map(([n, , v]) => [n, v])),
  faltantes: [],
};
