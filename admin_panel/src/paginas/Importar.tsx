import { useMemo, useState, type ChangeEvent } from 'react';
import { doc, writeBatch, setDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/cliente';
import { useSesion } from '../firebase/sesion';
import { leerCSV, aSlug } from '../importar/csv';
import { ESQUEMAS, validar, type Esquema } from '../importar/esquemas';

const LIMITE_LOTE = 400; // Firestore admite 500; dejamos margen.

export function Importar() {
  const { municipioId } = useSesion();
  const [esquema, setEsquema] = useState<Esquema>(ESQUEMAS[0]);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analisis = useMemo(() => {
    if (!texto.trim()) return null;
    return validar(esquema, leerCSV(texto));
  }, [texto, esquema]);

  const conErrores = analisis?.validadas.filter((f) => f.errores.length) ?? [];
  const listas = analisis?.validadas.filter((f) => !f.errores.length) ?? [];
  const puedeImportar =
    !!municipioId && !analisis?.errorGeneral && listas.length > 0 && conErrores.length === 0;

  function alSubirArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    archivo.text().then(setTexto);
  }

  async function importar() {
    if (!municipioId || !analisis) return;
    setGuardando(true);
    setResultado(null);
    setError(null);

    try {
      const base = `municipios/${municipioId}`;

      if (esquema.destino.tipo === 'documento') {
        // colonias y emergencias viven como un solo documento con una lista.
        const lista = listas.map((f) => ({
          id: aSlug(String(f.datos.nombre)),
          ...f.datos,
        }));
        await setDoc(doc(db, `${base}/${esquema.destino.ruta}`), { lista }, { merge: false });
        setResultado(`${lista.length} renglones guardados en ${esquema.destino.ruta}.`);
      } else {
        const nombre = esquema.destino.nombre;
        let escritos = 0;
        for (let i = 0; i < listas.length; i += LIMITE_LOTE) {
          const trozo = listas.slice(i, i + LIMITE_LOTE);
          const lote = writeBatch(db);
          for (const fila of trozo) {
            const id = esquema.idDeFila
              ? esquema.idDeFila(fila.datos)
              : doc(collection(db, `${base}/${nombre}`)).id;
            lote.set(doc(db, `${base}/${nombre}/${id}`), fila.datos, { merge: true });
          }
          await lote.commit();
          escritos += trozo.length;
        }
        setResultado(`${escritos} documentos guardados en ${nombre}.`);
      }
      setTexto('');
    } catch {
      setError('No se pudo guardar. Revisa que tu cuenta tenga rol de funcionario.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--e20)', maxWidth: 820 }}>
      <div className="tarjeta" style={{ display: 'grid', gap: 'var(--e16)' }}>
        <div>
          <h2>Cargar datos desde una hoja de calculo</h2>
          <p className="secundario" style={{ margin: '4px 0 0', fontSize: 13 }}>
            Exporta la hoja como CSV y pegala aqui. Se revisa antes de guardar nada.
          </p>
        </div>

        <div>
          <label htmlFor="esquema">Que vas a cargar</label>
          <select
            id="esquema"
            value={esquema.id}
            onChange={(e) => {
              setEsquema(ESQUEMAS.find((x) => x.id === e.target.value)!);
              setResultado(null);
            }}
          >
            {ESQUEMAS.map((x) => (
              <option key={x.id} value={x.id}>{x.titulo}</option>
            ))}
          </select>
          <p className="secundario" style={{ fontSize: 13, margin: '6px 0 0' }}>
            {esquema.descripcion}
          </p>
        </div>

        <div>
          <label htmlFor="csv">Pega el CSV</label>
          <textarea
            id="csv"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={esquema.ejemplo}
            rows={8}
            style={{
              width: '100%', padding: '10px var(--e12)', border: '1px solid var(--borde)',
              borderRadius: 'var(--radio-lista)', font: 'inherit',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13,
            }}
          />
          <input type="file" accept=".csv,text/csv" onChange={alSubirArchivo}
                 style={{ marginTop: 'var(--e8)', border: 'none', padding: 0 }} />
        </div>

        {analisis?.errorGeneral && <div className="aviso aviso-error">{analisis.errorGeneral}</div>}
        {resultado && <div className="aviso aviso-exito">{resultado}</div>}
        {error && <div className="aviso aviso-error">{error}</div>}

        <button onClick={importar} disabled={!puedeImportar || guardando}>
          {guardando ? 'Guardando...' : `Guardar ${listas.length || ''} renglones`}
        </button>
      </div>

      {analisis && !analisis.errorGeneral && analisis.validadas.length > 0 && (
        <div className="tarjeta">
          <h2 style={{ marginBottom: 'var(--e12)' }}>
            Vista previa
            {conErrores.length > 0 && (
              <span style={{ color: 'var(--peligro)', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                {conErrores.length} renglon(es) con problemas — corrigelos antes de guardar
              </span>
            )}
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={celdaEnc}>#</th>
                  {esquema.campos.map((c) => <th key={c.clave} style={celdaEnc}>{c.etiqueta}</th>)}
                  <th style={celdaEnc}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {analisis.validadas.slice(0, 50).map((f) => (
                  <tr key={f.numero} style={{ background: f.errores.length ? '#FDECEC' : undefined }}>
                    <td style={celda}>{f.numero}</td>
                    {esquema.campos.map((c) => (
                      <td key={c.clave} style={celda}>{String(f.datos[c.clave] ?? '')}</td>
                    ))}
                    <td style={{ ...celda, color: f.errores.length ? 'var(--peligro)' : 'var(--exito)' }}>
                      {f.errores.length ? f.errores.join(', ') : 'ok'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {analisis.validadas.length > 50 && (
            <p className="secundario" style={{ fontSize: 13 }}>
              Se muestran los primeros 50 de {analisis.validadas.length}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const celdaEnc: React.CSSProperties = {
  textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--borde)',
  fontWeight: 600, whiteSpace: 'nowrap',
};
const celda: React.CSSProperties = {
  padding: '6px 8px', borderBottom: '1px solid var(--borde)', whiteSpace: 'nowrap',
};
