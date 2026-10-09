/**
 * Lector de CSV minimo pero correcto: respeta comillas, comas dentro de
 * comillas y saltos de linea de Windows.
 *
 * No usamos libreria porque lo que llega del municipio son hojas de calculo
 * exportadas a mano, y aqui necesitamos control sobre los errores para poder
 * decirle a la persona en que renglon se equivoco.
 */
export function leerCSV(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let enComillas = false;

  const limpio = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];

    if (enComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          enComillas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      enComillas = true;
    } else if (c === ',' || c === ';') {
      fila.push(campo.trim());
      campo = '';
    } else if (c === '\n') {
      fila.push(campo.trim());
      if (fila.some((v) => v !== '')) filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }

  fila.push(campo.trim());
  if (fila.some((v) => v !== '')) filas.push(fila);

  return filas;
}

/** Convierte texto a un identificador estable para Firestore. */
export function aSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
