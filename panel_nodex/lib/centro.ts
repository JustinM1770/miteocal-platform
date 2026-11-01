import { ETIQUETA_REPORTE, type Reporte, type TipoReporte, type UrgenciaReporte, type EstadoReporte } from "./datos";
import { f } from "./almacen";

/* Centro de mando: lógica sin mapa (órdenes, urgencias, colores, informe).
   El mapa está en app/panel/centro/page.tsx. */

export type Capa = "edificios" | "calor" | "basura" | "cierres";

export interface Orden {
  accion: "filtrar" | "volar" | "capa" | "informe" | "todo";
  tipo?: TipoReporte;
  urgencia?: UrgenciaReporte;
  /** "abiertos" = recibidos y en proceso */
  estado?: EstadoReporte | "abiertos";
  colonia?: string;
  capa?: Capa;
  encender?: boolean;
  /** lo que el centro le contesta a quien dio la orden */
  respuesta: string;
}

/** Colores del panel por tipo de reporte */
export const COLOR_TIPO: Record<TipoReporte, string> = {
  fuga: "#1552e0",
  drenaje: "#6b3db8",
  bache: "#c77700",
  luminaria: "#d9a400",
  basura: "#12a150",
  otro: "#5a6270",
};

export const ALTURA_URGENCIA: Record<UrgenciaReporte, number> = { alta: 140, media: 80, baja: 45 };

const URGENCIA_POR_TIPO: Record<TipoReporte, UrgenciaReporte> = {
  fuga: "alta", drenaje: "media", bache: "media", luminaria: "baja", basura: "baja", otro: "baja",
};

/** La del funcionario si ya la confirmó; si no, la que sugirió la IA; si no, una por tipo */
export function urgenciaDe(r: Reporte): UrgenciaReporte {
  return r.clasificacionFinal?.urgencia ?? r.clasificacionIASugerida?.urgencia ?? URGENCIA_POR_TIPO[r.tipo];
}

export const abierto = (r: Reporte) => r.estado !== "resuelto";

/** Cuadro de ~`metros` de lado alrededor de un punto, para levantar la columna de luz */
export function cuadro(lng: number, lat: number, metros = 7): [number, number][][] {
  const dLat = metros / 2 / 111_320;
  const dLng = metros / 2 / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [[
    [lng - dLng, lat - dLat], [lng + dLng, lat - dLat], [lng + dLng, lat + dLat], [lng - dLng, lat + dLat], [lng - dLng, lat - dLat],
  ]];
}

export function aplicaFiltro(r: Reporte, o: Partial<Orden>): boolean {
  if (o.tipo && r.tipo !== o.tipo) return false;
  if (o.urgencia && urgenciaDe(r) !== o.urgencia) return false;
  if (o.estado === "abiertos" && !abierto(r)) return false;
  if (o.estado && o.estado !== "abiertos" && r.estado !== o.estado) return false;
  if (o.colonia && sinAcentos(r.colonia) !== sinAcentos(o.colonia)) return false;
  return true;
}

export const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const PALABRAS_TIPO: [RegExp, TipoReporte][] = [
  [/\b(fuga|fugas|agua)\b/, "fuga"],
  [/\b(bache|baches|pavimento)\b/, "bache"],
  [/\b(luminaria|luminarias|lampara|lamparas|luz|alumbrado)\b/, "luminaria"],
  [/\b(drenaje|alcantarilla|coladera)\b/, "drenaje"],
  [/\b(basura|recoleccion)\b/, "basura"],
];

/**
 * Entiende órdenes sencillas sin IA ("fugas urgentes", "vuela a San Miguel Norte",
 * "muestra zonas críticas"). La ruta /api/centro/orden usa Claude cuando hay llave;
 * esto es el respaldo y lo que corre en el demo.
 */
export function interpretarOrden(texto: string, colonias: string[]): Orden {
  const t = sinAcentos(texto);
  const colonia = [...colonias].sort((a, b) => b.length - a.length).find((c) => t.includes(sinAcentos(c)));

  if (/\b(informe|resumen|como vamos|estado general|reporte del dia)\b/.test(t)) {
    return { accion: "informe", respuesta: "Generando el informe del día." };
  }
  if (/\b(todo|todos|limpia|limpiar|reinicia|quita filtros)\b/.test(t) && !colonia) {
    return { accion: "todo", respuesta: "Mostrando todos los reportes." };
  }

  const apagar = /\b(quita|oculta|apaga|esconde)\b/.test(t);
  const capa: Capa | undefined =
    /(zonas? criticas?|calor|mapa de calor)/.test(t) ? "calor"
      : /(camion|ruta de basura|rutas de basura|recoleccion en vivo)/.test(t) ? "basura"
        : /(cierres?|obras?|calles cerradas)/.test(t) ? "cierres"
          : /(edificios|3d|holograma)/.test(t) ? "edificios"
            : undefined;
  const tipo = PALABRAS_TIPO.find(([re]) => re.test(t))?.[1];

  if (capa && !(tipo && capa === "basura" && !/camion|ruta/.test(t))) {
    const nombre = { calor: "zonas críticas", basura: "rutas del camión de basura", cierres: "cierres y obras", edificios: "edificios en 3D" }[capa];
    return { accion: "capa", capa, encender: !apagar, respuesta: `${apagar ? "Ocultando" : "Mostrando"} ${nombre}.` };
  }

  const urgencia: UrgenciaReporte | undefined =
    /\b(urgente|urgentes|alta|graves?|criticos?)\b/.test(t) ? "alta" : /\b(media)\b/.test(t) ? "media" : undefined;
  const estado: Orden["estado"] =
    /\b(resueltos?|atendidos?|cerrados?)\b/.test(t) ? "resuelto"
      : /\b(en proceso|en camino)\b/.test(t) ? "en_proceso"
        : /\b(pendientes?|abiertos?|sin atender)\b/.test(t) ? "abiertos" : undefined;

  if (tipo || urgencia || estado) {
    const partes = [
      tipo ? ETIQUETA_REPORTE[tipo].toLowerCase() : "reportes",
      urgencia === "alta" ? "urgentes" : urgencia === "media" ? "de urgencia media" : "",
      estado === "resuelto" ? "resueltos" : estado === "en_proceso" ? "en proceso" : estado === "abiertos" ? "pendientes" : "",
      colonia ? `en ${colonia}` : "",
    ].filter(Boolean);
    return { accion: "filtrar", tipo, urgencia, estado, colonia, respuesta: `Mostrando ${partes.join(" ")}.` };
  }

  if (colonia) return { accion: "volar", colonia, respuesta: `Volando a ${colonia}.` };

  return {
    accion: "todo",
    respuesta: "No entendí la orden. Prueba con «fugas urgentes», «vuela a San Miguel Norte» o «muestra zonas críticas».",
  };
}

export interface Informe {
  abiertos: number;
  urgentes: number;
  resueltosSemana: number;
  nuevosHoy: number;
  /** horas promedio entre que llega un reporte y su primera atención */
  respuestaHoras: number | null;
  coloniaCritica: { nombre: string; abiertos: number; tipo: TipoReporte } | null;
  porTipo: { tipo: TipoReporte; abiertos: number }[];
}

export function informe(reportes: Reporte[], ahora = new Date()): Informe {
  const dia = 86_400_000;
  const abiertos = reportes.filter(abierto);
  const porColonia = new Map<string, Reporte[]>();
  abiertos.forEach((r) => porColonia.set(r.colonia, [...(porColonia.get(r.colonia) ?? []), r]));
  const [nombre, lista] = [...porColonia.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
  const tipos = new Map<TipoReporte, number>();
  (lista ?? []).forEach((r) => tipos.set(r.tipo, (tipos.get(r.tipo) ?? 0) + 1));

  const tiempos = reportes
    .map((r) => {
      const primera = r.historial[0];
      return primera ? (+f(primera.fecha) - +f(r.creadoEn)) / 3_600_000 : null;
    })
    .filter((h): h is number => h !== null && h >= 0);

  const conteo = new Map<TipoReporte, number>();
  abiertos.forEach((r) => conteo.set(r.tipo, (conteo.get(r.tipo) ?? 0) + 1));

  return {
    abiertos: abiertos.length,
    urgentes: abiertos.filter((r) => urgenciaDe(r) === "alta").length,
    resueltosSemana: reportes.filter((r) => r.estado === "resuelto" && +ahora - +f(r.historial[r.historial.length - 1]?.fecha ?? r.creadoEn) <= 7 * dia).length,
    nuevosHoy: reportes.filter((r) => +ahora - +f(r.creadoEn) <= dia).length,
    respuestaHoras: tiempos.length ? Math.round((tiempos.reduce((s, h) => s + h, 0) / tiempos.length) * 10) / 10 : null,
    coloniaCritica: nombre && lista ? { nombre, abiertos: lista.length, tipo: [...tipos.entries()].sort((a, b) => b[1] - a[1])[0][0] } : null,
    porTipo: [...conteo.entries()].map(([tipo, n]) => ({ tipo, abiertos: n })).sort((a, b) => b.abiertos - a.abiertos),
  };
}

/** El informe en voz alta: solo números que salen del sistema, nada inventado */
export function narrar(i: Informe, municipio: string): string {
  const partes = [`Informe de ${municipio || "tu municipio"}.`];
  partes.push(i.abiertos === 0 ? "No hay reportes pendientes." : `Hay ${i.abiertos} reportes pendientes, ${i.urgentes} de urgencia alta.`);
  if (i.nuevosHoy) partes.push(`Hoy llegaron ${i.nuevosHoy}.`);
  if (i.coloniaCritica) {
    partes.push(`La zona con más pendientes es ${i.coloniaCritica.nombre}, con ${i.coloniaCritica.abiertos}, sobre todo de ${ETIQUETA_REPORTE[i.coloniaCritica.tipo].toLowerCase()}.`);
  }
  partes.push(`En los últimos siete días se resolvieron ${i.resueltosSemana}.`);
  if (i.respuestaHoras !== null) partes.push(`El tiempo promedio de primera respuesta es de ${i.respuestaHoras} horas.`);
  return partes.join(" ");
}
