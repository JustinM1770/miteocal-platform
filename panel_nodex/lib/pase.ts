/* Contenido del QR del pase digital: MITEOCAL1|<municipio>|<folio>|<pagoId>
   No lleva datos personales. Quien valida busca el pago por folio y lo marca
   como usado en una transacción (lib/feria.ts → validarBoleto). Con la
   pasarela real, una Cloud Function agregará una firma para que no se pueda
   inventar un folio. */

const PREFIJO = "MITEOCAL1";

export const contenidoPase = (municipio: string, folio: string, pagoId: string) => [PREFIJO, municipio, folio, pagoId].join("|");

export interface PaseLeido { municipio: string; folio: string; pagoId: string }

/** Acepta el contenido del QR o, como respaldo, el folio escrito a mano */
export function leerPase(texto: string): PaseLeido | { folio: string } | null {
  const t = texto.trim();
  if (t.startsWith(`${PREFIJO}|`)) {
    const [, municipio, folio, pagoId] = t.split("|");
    return municipio && folio && pagoId ? { municipio, folio, pagoId } : null;
  }
  return /^[A-Z]{2,5}-\d{3,}$/i.test(t) ? { folio: t.toUpperCase() } : null;
}
