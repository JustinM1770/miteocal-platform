import { aSlug } from './csv';

export interface Campo {
  clave: string;
  etiqueta: string;
  requerido?: boolean;
  tipo?: 'texto' | 'numero' | 'booleano';
}

export interface Esquema {
  id: string;
  titulo: string;
  descripcion: string;
  /** Ruta relativa al municipio. `config` son documentos, no colecciones. */
  destino: { tipo: 'coleccion'; nombre: string } | { tipo: 'documento'; ruta: string };
  campos: Campo[];
  ejemplo: string;
  /** Como se arma el id del documento a partir de la fila. */
  idDeFila?: (fila: Record<string, unknown>) => string;
}

export const ESQUEMAS: Esquema[] = [
  {
    id: 'colonias',
    titulo: 'Colonias',
    descripcion:
      'Listado de colonias con su centroide. Se usa para asignar vecinos y para segmentar los avisos.',
    destino: { tipo: 'documento', ruta: 'config/colonias' },
    campos: [
      { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
      { clave: 'lat', etiqueta: 'Latitud', tipo: 'numero' },
      { clave: 'lng', etiqueta: 'Longitud', tipo: 'numero' },
    ],
    ejemplo: 'nombre,lat,lng\nCentro,21.4333,-102.5833\nSan Miguel,21.4340,-102.5850',
  },
  {
    id: 'emergencias',
    titulo: 'Directorio de emergencias',
    descripcion:
      'Policia, Cruz Roja, Proteccion Civil, SAPAS. Verifica cada numero antes de publicar: uno equivocado es peor que ninguno.',
    destino: { tipo: 'documento', ruta: 'config/emergencias' },
    campos: [
      { clave: 'nombre', etiqueta: 'Dependencia', requerido: true },
      { clave: 'telefono', etiqueta: 'Telefono', requerido: true },
    ],
    ejemplo: 'nombre,telefono\nEmergencias,911\nPolicia Municipal,346 000 0000',
  },
  {
    id: 'eventos',
    titulo: 'Cartelera de la feria',
    descripcion:
      'Artistas, fechas y precios. Esto es lo que la gente va a buscar durante la feria.',
    destino: { tipo: 'coleccion', nombre: 'eventos' },
    campos: [
      { clave: 'artista', etiqueta: 'Artista o evento', requerido: true },
      { clave: 'fecha', etiqueta: 'Fecha (AAAA-MM-DD)', requerido: true },
      { clave: 'hora', etiqueta: 'Hora' },
      { clave: 'lugar', etiqueta: 'Lugar' },
      { clave: 'precio', etiqueta: 'Precio', tipo: 'numero' },
      { clave: 'disponible', etiqueta: 'Disponible', tipo: 'booleano' },
    ],
    ejemplo:
      'artista,fecha,hora,lugar,precio,disponible\nBanda El Recodo,2026-10-29,21:00,Palenque,850,si',
    idDeFila: (f) => aSlug(`${f.fecha}-${f.artista}`),
  },
  {
    id: 'comercios',
    titulo: 'Directorio de comercios',
    descripcion: 'Negocios locales con su contacto de WhatsApp.',
    destino: { tipo: 'coleccion', nombre: 'comercios' },
    campos: [
      { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
      { clave: 'categoria', etiqueta: 'Categoria', requerido: true },
      { clave: 'whatsapp', etiqueta: 'WhatsApp' },
      { clave: 'destacado', etiqueta: 'Destacado', tipo: 'booleano' },
      { clave: 'aceptaUsd', etiqueta: 'Acepta USD', tipo: 'booleano' },
    ],
    ejemplo:
      'nombre,categoria,whatsapp,destacado,aceptaUsd\nElectronica Ultra,Tienda,+523460000000,si,si',
    idDeFila: (f) => aSlug(String(f.nombre)),
  },
];

export interface FilaValidada {
  numero: number;
  datos: Record<string, unknown>;
  errores: string[];
}

export function validar(esquema: Esquema, filas: string[][]): {
  encabezados: string[];
  validadas: FilaValidada[];
  errorGeneral: string | null;
} {
  if (filas.length < 2) {
    return { encabezados: [], validadas: [], errorGeneral: 'El archivo necesita encabezados y al menos un renglon.' };
  }

  const encabezados = filas[0].map((h) => h.toLowerCase());
  const faltantes = esquema.campos
    .filter((c) => c.requerido && !encabezados.includes(c.clave))
    .map((c) => c.clave);

  if (faltantes.length) {
    return {
      encabezados,
      validadas: [],
      errorGeneral: `Faltan columnas obligatorias: ${faltantes.join(', ')}`,
    };
  }

  const validadas = filas.slice(1).map((fila, i) => {
    const datos: Record<string, unknown> = {};
    const errores: string[] = [];

    for (const campo of esquema.campos) {
      const col = encabezados.indexOf(campo.clave);
      const bruto = col >= 0 ? (fila[col] ?? '') : '';

      if (campo.requerido && !bruto) {
        errores.push(`falta ${campo.etiqueta}`);
        continue;
      }
      if (!bruto) continue;

      if (campo.tipo === 'numero') {
        const n = Number(bruto.replace(/[^0-9.-]/g, ''));
        if (Number.isNaN(n)) errores.push(`${campo.etiqueta} no es un numero`);
        else datos[campo.clave] = n;
      } else if (campo.tipo === 'booleano') {
        datos[campo.clave] = /^(si|sí|true|1|x)$/i.test(bruto);
      } else {
        datos[campo.clave] = bruto;
      }
    }

    return { numero: i + 2, datos, errores };
  });

  return { encabezados, validadas, errorGeneral: null };
}
