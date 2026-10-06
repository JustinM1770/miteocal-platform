import type { Canal, Tipo } from "./datos";

/* ─── Módulos ───────────────────────────────────────────────
   Cada pantalla de la app ciudadana (Figma MiTeocal) que se
   alimenta desde el panel es un módulo. Todos guardan en la misma
   colección `publicaciones` con su `tipo`; lo que cambia es qué
   campos pide el formulario y cómo se ve la vista previa.
   Agregar un módulo nuevo = agregar una entrada aquí.
   ───────────────────────────────────────────────────────── */

export interface Campo {
  /** "titulo", "mensaje" y "colonia" van al documento; el resto a `datos` */
  clave: string;
  etiqueta: string;
  /** seg = botones de color (como los chips de la app); dias = L M X J V S D */
  tipo: "texto" | "area" | "fecha" | "hora" | "select" | "seg" | "dias" | "colonia" | "tel" | "url" | "tramo";
  opciones?: string[];
  /** color de cada opción de un seg, en el mismo orden: azul, rojo, naranja, verde, morado, gris */
  colores?: string[];
  placeholder?: string;
  ayuda?: string;
  opcional?: boolean;
}

export interface Modulo {
  slug: string;
  tipo: Tipo;
  canal: Canal;
  nombre: string;
  /** pantalla de la app donde aparece */
  pantalla: string;
  descripcion: string;
  campos: Campo[];
  /** horas hasta que la app lo marque «sin información»; null = no caduca */
  caducaHoras: number | null;
  notificarPorDefecto: boolean;
  /** texto del botón principal */
  accion: string;
  /** para módulos sin campo «titulo»: cómo se arma el título */
  tituloDe?: (v: Record<string, string>) => string;
  /** cómo se arma la línea secundaria de la vista previa */
  resumen?: (d: Record<string, string>) => string;
}

const COLONIA: Campo = { clave: "colonia", etiqueta: "Colonia", tipo: "colonia" };
const COLONIA_OPC: Campo = { clave: "colonia", etiqueta: "Colonia", tipo: "colonia", opcional: true, ayuda: "Déjalo vacío si es para todo el municipio." };

function fechaCorta(f?: string) {
  if (!f) return "";
  const d = new Date(`${f}T12:00:00`);
  return isNaN(+d) ? f : d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}
const unir = (...p: (string | undefined)[]) => p.filter(Boolean).join(" · ");

export const MODULOS: Modulo[] = [
  {
    slug: "cortes", tipo: "corte", canal: "publico", nombre: "Cortes programados", pantalla: "13 · Agua",
    descripcion: "Mantenimientos con fecha. La app avisa en la tarjeta de agua de la colonia.",
    campos: [
      COLONIA,
      { clave: "titulo", etiqueta: "Motivo", tipo: "texto", placeholder: "Mantenimiento del pozo El Salitre" },
      { clave: "fecha", etiqueta: "Fecha", tipo: "fecha" },
      { clave: "horario", etiqueta: "Horario", tipo: "texto", placeholder: "8:00 a 14:00 hrs" },
      { clave: "mensaje", etiqueta: "Mensaje para los vecinos", tipo: "area", placeholder: "Junta agua desde un día antes." },
    ],
    caducaHoras: null, notificarPorDefecto: true, accion: "Programar corte",
    resumen: (d) => unir(fechaCorta(d.fecha), d.horario),
  },
  {
    slug: "incidente", tipo: "incidente", canal: "publico", nombre: "Bitácora del incidente", pantalla: "13 · Agua · Qué ha pasado",
    descripcion: "Cada avance de una falla se agrega a la línea de tiempo que ve el vecino.",
    campos: [
      COLONIA,
      { clave: "titulo", etiqueta: "Hito", tipo: "seg", opciones: ["Reporte recibido", "Diagnóstico", "Cuadrilla en sitio", "Restablecimiento"], colores: ["gris", "naranja", "azul", "verde"] },
      { clave: "hora", etiqueta: "Hora", tipo: "hora", ayuda: "Si es una estimación (por ejemplo, el restablecimiento), la app la muestra con «~»." },
      { clave: "mensaje", etiqueta: "Qué pasó", tipo: "area", placeholder: "Personal de SAPAS trabajando en la reparación." },
    ],
    caducaHoras: 24, notificarPorDefecto: false, accion: "Agregar a la bitácora",
  },
  {
    slug: "basura", tipo: "basura", canal: "publico", nombre: "Basura en vivo", pantalla: "14 · Basura en vivo",
    descripcion: "Ruta del camión y hora aproximada en que llega a cada calle.",
    campos: [
      COLONIA,
      { clave: "titulo", etiqueta: "Ruta y unidad", tipo: "texto", placeholder: "Ruta Centro · Unidad 04" },
      { clave: "dias", etiqueta: "Días de recolección", tipo: "dias" },
      { clave: "hora", etiqueta: "Llega aproximadamente", tipo: "hora" },
      { clave: "mensaje", etiqueta: "Aviso", tipo: "area", placeholder: "Hoy el camión va con 30 minutos de retraso." },
    ],
    caducaHoras: 12, notificarPorDefecto: false, accion: "Publicar ruta",
    resumen: (d) => unir(d.dias?.split(",").join(" "), d.hora && `Llega ~${d.hora}`),
  },
  {
    slug: "cierres", tipo: "cierre", canal: "publico", nombre: "Cierres y obras", pantalla: "15 · Cierres y obras",
    descripcion: "Calles cerradas, obras y desvíos. Aparecen en el mapa de cierres.",
    campos: [
      { clave: "categoria", etiqueta: "Tipo", tipo: "seg", opciones: ["Cierre total", "Cierre temporal", "Obra"], colores: ["rojo", "rojo", "naranja"] },
      { clave: "titulo", etiqueta: "Título", tipo: "texto", placeholder: "Rehabilitación de calle 2 de Abril" },
      { clave: "lugar", etiqueta: "Calle o tramo", tipo: "texto", placeholder: "Zaragoza entre Hidalgo y Morelos" },
      { clave: "trazo", etiqueta: "Tramo en el mapa", tipo: "tramo", ayuda: "Toca el inicio y el final del tramo cerrado; se dibuja sobre la calle." },
      COLONIA_OPC,
      { clave: "fecha", etiqueta: "Desde", tipo: "fecha" },
      { clave: "hasta", etiqueta: "Hasta", tipo: "fecha", opcional: true },
      { clave: "mensaje", etiqueta: "Detalle", tipo: "area", placeholder: "Un carril cerrado en dirección norte, de 8:00 a 18:00 hrs." },
      { clave: "ruta", etiqueta: "Ruta alterna", tipo: "texto", opcional: true, placeholder: "Por Hidalgo y Morelos" },
    ],
    caducaHoras: null, notificarPorDefecto: true, accion: "Publicar cierre",
    resumen: (d) => unir(d.categoria, d.lugar, fechaCorta(d.fecha)),
  },
  {
    slug: "escuelas", tipo: "escuela", canal: "publico", nombre: "Escuelas", pantalla: "16 · Escuelas",
    descripcion: "Suspensiones y avisos. Solo los reciben los papás que siguen esa escuela.",
    campos: [
      { clave: "escuela", etiqueta: "Escuela", tipo: "select", opciones: ["CBTIS 247", "Secundaria Federal 20", "Primaria Benito Juárez", "Primaria Rafael Ramírez", "Jardín de Niños Rosaura Zapata"] },
      { clave: "categoria", etiqueta: "Tipo de aviso", tipo: "seg", opciones: ["Suspensión de clases", "Aviso", "Examen de ingreso", "Evento"], colores: ["rojo", "azul", "verde", "morado"] },
      { clave: "fecha", etiqueta: "Fecha", tipo: "fecha" },
      { clave: "mensaje", etiqueta: "Mensaje", tipo: "area", placeholder: "Viernes 16: no hay clases por junta de consejo técnico." },
    ],
    caducaHoras: null, notificarPorDefecto: true, accion: "Publicar aviso",
    tituloDe: (v) => unir(v.categoria, v.escuela),
    resumen: (d) => unir(d.escuela, fechaCorta(d.fecha)),
  },
  {
    slug: "noticias", tipo: "noticia", canal: "publico", nombre: "Noticias", pantalla: "02 · Noticias y Comunidad",
    descripcion: "Notas del ayuntamiento, filtradas por categoría en la app.",
    campos: [
      { clave: "categoria", etiqueta: "Categoría", tipo: "seg", opciones: ["Obras", "Salud", "Cultura", "Gobierno", "Seguridad"], colores: ["azul", "verde", "morado", "gris", "rojo"] },
      { clave: "titulo", etiqueta: "Titular", tipo: "texto", placeholder: "Rehabilitación de calle Benito Juárez inicia el lunes" },
      { clave: "fuente", etiqueta: "Fuente", tipo: "texto", opcional: true, placeholder: "Obras Públicas" },
      { clave: "mensaje", etiqueta: "Nota", tipo: "area", placeholder: "Dos o tres párrafos cortos." },
      { clave: "imagen", etiqueta: "Imagen (URL)", tipo: "url", opcional: true },
      COLONIA_OPC,
    ],
    caducaHoras: null, notificarPorDefecto: false, accion: "Publicar nota",
    resumen: (d) => d.categoria ?? "",
  },
  {
    slug: "parroquia", tipo: "parroquia", canal: "publico", nombre: "Avisos parroquiales", pantalla: "02 · Noticias y Comunidad",
    descripcion: "Misas y avisos de los templos del municipio.",
    campos: [
      { clave: "templo", etiqueta: "Templo", tipo: "select", opciones: ["Parroquia de San Miguel Arcángel", "Templo de El Señor de Las Maravillas"] },
      { clave: "titulo", etiqueta: "Aviso", tipo: "texto", placeholder: "Misa dominical" },
      { clave: "fecha", etiqueta: "Fecha", tipo: "fecha" },
      { clave: "hora", etiqueta: "Hora", tipo: "hora" },
      { clave: "mensaje", etiqueta: "Detalle", tipo: "area", opcional: true },
    ],
    caducaHoras: null, notificarPorDefecto: false, accion: "Publicar aviso",
    resumen: (d) => unir(d.templo, fechaCorta(d.fecha), d.hora && `${d.hora} hrs`),
  },
  {
    slug: "esquelas", tipo: "esquela", canal: "publico", nombre: "Esquelas", pantalla: "02 · Noticias y Comunidad",
    descripcion: "Se publican con permiso de la familia. Nunca llevan notificación.",
    campos: [
      { clave: "titulo", etiqueta: "Nombre completo", tipo: "texto", placeholder: "Ma. de Jesús Torres Villanueva" },
      { clave: "fallecio", etiqueta: "Falleció el", tipo: "fecha" },
      { clave: "lugar", etiqueta: "Lugar de la misa", tipo: "texto", placeholder: "Templo de El Señor de Las Maravillas" },
      { clave: "fecha", etiqueta: "Fecha", tipo: "fecha" },
      { clave: "hora", etiqueta: "Hora", tipo: "hora" },
      { clave: "mensaje", etiqueta: "Texto", tipo: "area", placeholder: "Misa de cuerpo presente." },
    ],
    caducaHoras: 72, notificarPorDefecto: false, accion: "Publicar esquela",
    resumen: (d) => unir(d.lugar, fechaCorta(d.fecha), d.hora && `${d.hora} hrs`),
  },
  {
    slug: "empleo", tipo: "vacante", canal: "publico", nombre: "Bolsa de trabajo", pantalla: "03 · Comercio y Empleo",
    descripcion: "Vacantes de negocios locales. Revisa que el contacto sea real antes de publicar.",
    campos: [
      { clave: "titulo", etiqueta: "Puesto", tipo: "texto", placeholder: "Secretaria bilingüe" },
      { clave: "negocio", etiqueta: "Negocio", tipo: "texto", placeholder: "Notaría Pública No. 4" },
      { clave: "categoria", etiqueta: "Jornada", tipo: "seg", opciones: ["Tiempo completo", "Medio tiempo", "Por proyecto"], colores: ["azul", "azul", "azul"] },
      { clave: "salario", etiqueta: "Sueldo", tipo: "texto", placeholder: "$6,500 / mes" },
      { clave: "contacto", etiqueta: "Teléfono de contacto", tipo: "tel" },
      { clave: "mensaje", etiqueta: "Requisitos", tipo: "area" },
    ],
    caducaHoras: 24 * 30, notificarPorDefecto: false, accion: "Publicar vacante",
    resumen: (d) => unir(d.negocio, d.categoria),
  },
  {
    slug: "clasificados", tipo: "clasificado", canal: "publico", nombre: "Clasificados", pantalla: "03 · Comercio y Empleo",
    descripcion: "Venta y renta entre vecinos. Caducan solos a los 15 días.",
    campos: [
      { clave: "categoria", etiqueta: "Categoría", tipo: "seg", opciones: ["Vehículo", "Inmueble", "Servicio", "Otro"], colores: ["azul", "azul", "azul", "azul"] },
      { clave: "titulo", etiqueta: "Título", tipo: "texto", placeholder: "Se renta casa, 3 recámaras, Col. Centro" },
      { clave: "precio", etiqueta: "Precio", tipo: "texto", opcional: true, placeholder: "$4,500 al mes" },
      { clave: "contacto", etiqueta: "Teléfono de contacto", tipo: "tel" },
      { clave: "mensaje", etiqueta: "Descripción", tipo: "area" },
    ],
    caducaHoras: 24 * 15, notificarPorDefecto: false, accion: "Publicar clasificado",
    resumen: (d) => unir(d.categoria, d.precio),
  },
  {
    slug: "paisanos", tipo: "paisanos", canal: "publico", nombre: "Paisanos", pantalla: "06 · Paisanos",
    descripcion: "Trámites que se pueden hacer desde Estados Unidos.",
    campos: [
      { clave: "categoria", etiqueta: "Trámite", tipo: "seg", opciones: ["Predial", "Actas", "Pasaportes y apostillas", "Otro"], colores: ["azul", "azul", "azul", "azul"] },
      { clave: "titulo", etiqueta: "Título", tipo: "texto", placeholder: "Pago de predial desde el extranjero" },
      { clave: "mensaje", etiqueta: "Cómo se hace", tipo: "area" },
      { clave: "enlace", etiqueta: "Enlace al trámite", tipo: "url", opcional: true },
    ],
    caducaHoras: null, notificarPorDefecto: false, accion: "Publicar trámite",
    resumen: (d) => d.categoria ?? "",
  },
  {
    slug: "directorio", tipo: "contacto", canal: "publico", nombre: "Directorio de emergencia", pantalla: "04 · Servicios · Emergencias",
    descripcion: "Teléfonos que el vecino puede marcar con un toque. Verifícalos cada mes.",
    campos: [
      { clave: "titulo", etiqueta: "Nombre", tipo: "texto", placeholder: "Cruz Roja" },
      { clave: "telefono", etiqueta: "Teléfono", tipo: "tel" },
      { clave: "categoria", etiqueta: "Categoría", tipo: "seg", opciones: ["Emergencias", "Seguridad", "Salud", "Servicios"], colores: ["naranja", "azul", "rojo", "verde"] },
      { clave: "mensaje", etiqueta: "Horario o nota", tipo: "texto", placeholder: "Atención 24 horas." },
    ],
    caducaHoras: null, notificarPorDefecto: false, accion: "Guardar contacto",
    resumen: (d) => unir(d.categoria, d.telefono),
  },
  {
    slug: "avisos-internos", tipo: "aviso_interno", canal: "interno", nombre: "Avisos internos", pantalla: "Solo panel",
    descripcion: "Para el personal del ayuntamiento. No sale a la app.",
    campos: [
      { clave: "area", etiqueta: "Para", tipo: "select", opciones: ["Todas", "Agua Potable", "Obras Públicas", "Comunicación Social", "Protección Civil"] },
      { clave: "prioridad", etiqueta: "Prioridad", tipo: "seg", opciones: ["Normal", "Urgente"], colores: ["gris", "rojo"] },
      { clave: "titulo", etiqueta: "Asunto", tipo: "texto", placeholder: "Junta de dependencias del viernes" },
      { clave: "mensaje", etiqueta: "Mensaje", tipo: "area" },
    ],
    caducaHoras: null, notificarPorDefecto: false, accion: "Publicar aviso interno",
    resumen: (d) => d.area ? `Para: ${d.area}` : "",
  },
  {
    slug: "dependencias", tipo: "dependencia", canal: "interno", nombre: "Directorio de dependencias", pantalla: "Solo panel",
    descripcion: "Extensiones y responsables de cada área. No sale a la app.",
    campos: [
      { clave: "titulo", etiqueta: "Dependencia", tipo: "texto", placeholder: "Obras Públicas" },
      { clave: "mensaje", etiqueta: "Responsable", tipo: "texto", placeholder: "Ing. Ramírez · ext. 114" },
      { clave: "telefono", etiqueta: "Teléfono", tipo: "tel" },
    ],
    caducaHoras: null, notificarPorDefecto: false, accion: "Guardar dependencia",
    resumen: (d) => d.telefono ?? "",
  },
];

export const moduloPorSlug = (slug: string) => MODULOS.find((m) => m.slug === slug);
