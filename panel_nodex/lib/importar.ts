import { aSlug } from "./config";

/* Carga masiva desde CSV (hojas de cálculo que exporta el municipio).
   Viene del importador del antiguo admin_panel, adaptado al modelo del panel:
   mismas columnas base, mismos ids (slug), y validación renglón por
   renglón antes de guardar nada. */

/** Lector de CSV: respeta comillas, comas y punto y coma, y saltos de línea de Windows */
export function leerCSV(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let enComillas = false;
  const limpio = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (enComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') { campo += '"'; i++; } else enComillas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') enComillas = true;
    else if (c === "," || c === ";") { fila.push(campo.trim()); campo = ""; }
    else if (c === "\n") {
      fila.push(campo.trim());
      if (fila.some((v) => v !== "")) filas.push(fila);
      fila = []; campo = "";
    } else campo += c;
  }
  fila.push(campo.trim());
  if (fila.some((v) => v !== "")) filas.push(fila);
  return filas;
}

export interface CampoCSV {
  clave: string;
  etiqueta: string;
  requerido?: boolean;
  tipo?: "texto" | "numero" | "booleano" | "fecha" | "hora";
  /** valores permitidos (sin distinguir mayúsculas) */
  opciones?: string[];
}

export interface EsquemaCSV {
  id: "colonias" | "emergencias" | "comercios" | "escuelas" | "eventos";
  titulo: string;
  descripcion: string;
  campos: CampoCSV[];
  ejemplo: string;
  /** documento de config (lista completa) o colección (un documento por renglón) */
  destino: "config" | "coleccion";
  idDeFila: (f: Record<string, unknown>) => string;
}

const SI = /^(si|sí|true|1|x|verdadero)$/i;

export const ESQUEMAS: EsquemaCSV[] = [
  {
    id: "colonias", titulo: "Colonias y barrios", destino: "config",
    descripcion: "Listado de colonias con su zona, tipo y centro. Se usa para que el vecino elija la suya y para mandar avisos por sector.",
    campos: [
      { clave: "nombre", etiqueta: "Nombre", requerido: true },
      { clave: "zona", etiqueta: "Zona" },
      { clave: "tipo", etiqueta: "Tipo", opciones: ["Barrio tradicional", "Colonia", "Fraccionamiento", "Localidad"] },
      { clave: "lat", etiqueta: "Latitud", tipo: "numero" },
      { clave: "lng", etiqueta: "Longitud", tipo: "numero" },
      { clave: "horario", etiqueta: "Horario de agua" },
      { clave: "pozo", etiqueta: "Pozo" },
    ],
    ejemplo: "nombre,zona,tipo,lat,lng,horario,pozo\nEl Nejayote,Centro y zonas tradicionales,Barrio tradicional,21.4301,-102.5790,6:00 a 14:00,El Salitre",
    idDeFila: (f) => aSlug(String(f.nombre)),
  },
  {
    id: "emergencias", titulo: "Directorio de emergencia", destino: "config",
    descripcion: "Teléfonos que el vecino marca con un toque. Verifica cada número antes de publicar: uno equivocado es peor que ninguno.",
    campos: [
      { clave: "nombre", etiqueta: "Nombre", requerido: true },
      { clave: "telefono", etiqueta: "Teléfono", requerido: true },
      { clave: "categoria", etiqueta: "Categoría", opciones: ["Emergencias", "Seguridad", "Salud", "Servicios"] },
      { clave: "nota", etiqueta: "Nota" },
    ],
    ejemplo: "nombre,telefono,categoria,nota\nCruz Roja,346 787 0065,Salud,Ambulancias 24 horas",
    idDeFila: (f) => aSlug(String(f.nombre)),
  },
  {
    id: "comercios", titulo: "Padrón de comercios", destino: "coleccion",
    descripcion: "Negocios del municipio con su licencia. El id es el nombre: volver a importar el mismo negocio lo actualiza, no lo duplica.",
    campos: [
      { clave: "nombre", etiqueta: "Nombre", requerido: true },
      { clave: "categoria", etiqueta: "Categoría", requerido: true, opciones: ["Restaurantes", "Tiendas", "Salud", "Servicios", "Envíos a EE. UU."] },
      { clave: "whatsapp", etiqueta: "WhatsApp" },
      { clave: "colonia", etiqueta: "Colonia" },
      { clave: "direccion", etiqueta: "Dirección" },
      { clave: "empleados", etiqueta: "Empleados", tipo: "numero" },
      { clave: "formal", etiqueta: "Tiene RFC", tipo: "booleano" },
      { clave: "licencia", etiqueta: "Número de licencia" },
      { clave: "vence", etiqueta: "Vence (AAAA-MM-DD)", tipo: "fecha" },
      { clave: "alcohol", etiqueta: "Licencia de alcohol", tipo: "booleano" },
      { clave: "aceptaUsd", etiqueta: "Acepta USD", tipo: "booleano" },
      { clave: "qboard", etiqueta: "Tienda en qboard.mx" },
    ],
    ejemplo: "nombre,categoria,whatsapp,colonia,direccion,empleados,formal,licencia,vence,alcohol,aceptaUsd,qboard\nFarmacia San Rafael,Salud,+523461000001,Teocaltiche Centro,Zaragoza 45,4,si,LF-1020,2027-03-31,no,no,",
    idDeFila: (f) => aSlug(String(f.nombre)),
  },
  {
    id: "escuelas", titulo: "Escuelas", destino: "coleccion",
    descripcion: "Planteles que los papás pueden seguir en la app.",
    campos: [
      { clave: "nombre", etiqueta: "Nombre", requerido: true },
      { clave: "nivel", etiqueta: "Nivel", requerido: true, opciones: ["Preescolar", "Primaria", "Secundaria", "Bachillerato", "Universidad", "Educación especial"] },
      { clave: "cct", etiqueta: "CCT" },
      { clave: "turno", etiqueta: "Turno" },
      { clave: "colonia", etiqueta: "Colonia" },
      { clave: "director", etiqueta: "Director(a)" },
      { clave: "telefono", etiqueta: "Teléfono" },
      { clave: "alumnos", etiqueta: "Alumnos", tipo: "numero" },
    ],
    ejemplo: "nombre,nivel,cct,turno,colonia,director,telefono,alumnos\nPrimaria Benito Juárez,Primaria,14EPR0412K,Matutino,Teocaltiche Centro,Mtra. Elena Torres,,380",
    idDeFila: (f) => aSlug(String(f.nombre)),
  },
  {
    id: "eventos", titulo: "Cartelera de la feria", destino: "coleccion",
    descripcion: "Artistas, fechas y precios, con categoría y cupo.",
    campos: [
      { clave: "artista", etiqueta: "Artista o evento", requerido: true },
      { clave: "fecha", etiqueta: "Fecha (AAAA-MM-DD)", requerido: true, tipo: "fecha" },
      { clave: "hora", etiqueta: "Hora (HH:MM)", tipo: "hora" },
      { clave: "lugar", etiqueta: "Escenario" },
      { clave: "categoria", etiqueta: "Categoría", opciones: ["concierto", "toros", "palenque", "religioso", "cultural", "infantil", "certamen", "hijos_ausentes"] },
      { clave: "precio", etiqueta: "Precio (0 = gratis)", tipo: "numero" },
      { clave: "cupo", etiqueta: "Cupo", tipo: "numero" },
    ],
    ejemplo: "artista,fecha,hora,lugar,categoria,precio,cupo\nBanda El Recodo,2026-11-01,22:00,Plaza de Toros,concierto,450,1800",
    idDeFila: (f) => aSlug(`${f.fecha}-${f.artista}`),
  },
];

export interface FilaValidada { numero: number; datos: Record<string, unknown>; errores: string[] }

export function validar(esquema: EsquemaCSV, filas: string[][]): { encabezados: string[]; validadas: FilaValidada[]; errorGeneral: string | null } {
  if (filas.length < 2) return { encabezados: [], validadas: [], errorGeneral: "El archivo necesita encabezados y al menos un renglón." };
  const encabezados = filas[0].map((h) => h.trim().toLowerCase());
  const faltantes = esquema.campos.filter((c) => c.requerido && !encabezados.includes(c.clave.toLowerCase())).map((c) => c.clave);
  if (faltantes.length) return { encabezados, validadas: [], errorGeneral: `Faltan columnas obligatorias: ${faltantes.join(", ")}` };

  const vistos = new Map<string, number>();
  const validadas = filas.slice(1).map((fila, i) => {
    const datos: Record<string, unknown> = {};
    const errores: string[] = [];
    for (const campo of esquema.campos) {
      const col = encabezados.indexOf(campo.clave.toLowerCase());
      const bruto = col >= 0 ? (fila[col] ?? "").trim() : "";
      if (campo.requerido && !bruto) { errores.push(`falta ${campo.etiqueta}`); continue; }
      if (!bruto) continue;
      if (campo.tipo === "numero") {
        const n = Number(bruto.replace(/[$,\s]/g, ""));
        if (Number.isNaN(n)) errores.push(`${campo.etiqueta} no es un número`); else datos[campo.clave] = n;
      } else if (campo.tipo === "booleano") datos[campo.clave] = SI.test(bruto);
      else if (campo.tipo === "fecha") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto) || isNaN(+new Date(`${bruto}T12:00`))) errores.push(`${campo.etiqueta}: usa AAAA-MM-DD`); else datos[campo.clave] = bruto;
      } else if (campo.tipo === "hora") {
        if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(bruto)) errores.push(`${campo.etiqueta}: usa HH:MM`); else datos[campo.clave] = bruto.padStart(5, "0");
      } else if (campo.opciones) {
        const op = campo.opciones.find((o) => o.toLowerCase() === bruto.toLowerCase());
        if (!op) errores.push(`${campo.etiqueta} «${bruto}» no es válido`); else datos[campo.clave] = op;
      } else datos[campo.clave] = bruto;
    }
    if (!errores.length) {
      const id = esquema.idDeFila(datos);
      if (vistos.has(id)) errores.push(`repetido con el renglón ${vistos.get(id)}`); else vistos.set(id, i + 2);
    }
    return { numero: i + 2, datos, errores };
  });
  return { encabezados, validadas, errorGeneral: null };
}

/** Columnas del archivo que el esquema no conoce (se ignoran, pero se avisa) */
export function columnasIgnoradas(esquema: EsquemaCSV, encabezados: string[]) {
  const claves = esquema.campos.map((c) => c.clave.toLowerCase());
  return encabezados.filter((h) => h && !claves.includes(h));
}

/** Plantilla descargable con los encabezados y un renglón de ejemplo */
export const plantilla = (e: EsquemaCSV) => `﻿${e.ejemplo}\n`;
