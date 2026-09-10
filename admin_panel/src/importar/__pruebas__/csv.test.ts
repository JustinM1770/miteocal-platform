import { describe, it, expect } from 'vitest';
import { leerCSV, aSlug } from '../csv';
import { ESQUEMAS, validar } from '../esquemas';

const esquemaDe = (id: string) => ESQUEMAS.find((e) => e.id === id)!;

describe('leerCSV', () => {
  it('lee un archivo simple', () => {
    expect(leerCSV('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('respeta las comas dentro de comillas', () => {
    // El caso que rompe a los parsers ingenuos: una direccion con coma.
    expect(leerCSV('nombre,direccion\n"Perez, Juan","Calle 5, Centro"')).toEqual([
      ['nombre', 'direccion'],
      ['Perez, Juan', 'Calle 5, Centro'],
    ]);
  });

  it('entiende comillas escapadas', () => {
    expect(leerCSV('a\n"dijo ""hola"""')).toEqual([['a'], ['dijo "hola"']]);
  });

  it('acepta punto y coma, como exporta Excel en espanol', () => {
    expect(leerCSV('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('normaliza saltos de linea de Windows', () => {
    expect(leerCSV('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('descarta renglones vacios del final', () => {
    expect(leerCSV('a\n1\n\n\n')).toEqual([['a'], ['1']]);
  });
});

describe('aSlug', () => {
  it('quita acentos y espacios', () => {
    expect(aSlug('Encarnación de Díaz')).toBe('encarnacion-de-diaz');
  });

  it('no deja guiones sueltos en los extremos', () => {
    expect(aSlug('  ¡Feria! ')).toBe('feria');
  });
});

describe('validar', () => {
  it('rechaza un archivo sin columnas obligatorias', () => {
    const r = validar(esquemaDe('emergencias'), leerCSV('nombre\nPolicia'));
    expect(r.errorGeneral).toMatch(/telefono/);
  });

  it('marca el renglon al que le falta un dato obligatorio', () => {
    const r = validar(esquemaDe('emergencias'), leerCSV('nombre,telefono\nPolicia,\nCruz Roja,911'));
    expect(r.validadas[0].errores).toHaveLength(1);
    expect(r.validadas[0].numero).toBe(2); // numero de renglon del archivo
    expect(r.validadas[1].errores).toHaveLength(0);
  });

  it('convierte numeros y booleanos', () => {
    const r = validar(
      esquemaDe('eventos'),
      leerCSV('artista,fecha,precio,disponible\nBanda,2026-10-29,"$1,200",si')
    );
    expect(r.validadas[0].errores).toEqual([]);
    expect(r.validadas[0].datos.precio).toBe(1200);
    expect(r.validadas[0].datos.disponible).toBe(true);
  });

  it('trata "no" como falso', () => {
    const r = validar(esquemaDe('eventos'), leerCSV('artista,fecha,disponible\nX,2026-10-29,no'));
    expect(r.validadas[0].datos.disponible).toBe(false);
  });

  it('arma ids estables para la cartelera', () => {
    const esquema = esquemaDe('eventos');
    const r = validar(esquema, leerCSV('artista,fecha\nBanda El Recodo,2026-10-29'));
    expect(esquema.idDeFila!(r.validadas[0].datos)).toBe('2026-10-29-banda-el-recodo');
  });

  it('pide encabezados y al menos un renglon', () => {
    expect(validar(esquemaDe('colonias'), leerCSV('nombre,lat,lng')).errorGeneral).toBeTruthy();
  });
});
