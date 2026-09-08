import { useEffect, useState, type FormEvent } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/cliente';
import { useSesion } from '../firebase/sesion';

function hoyISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

interface EstadoAgua {
  horario: string;
  presion: number;
  calidad: string;
  cobertura: string;
  estado: 'activo' | 'sin-servicio';
}

const VACIO: EstadoAgua = {
  horario: '',
  presion: 0,
  calidad: 'Potable',
  cobertura: 'Total',
  estado: 'activo',
};

export function Agua() {
  const { municipioId } = useSesion();
  const fecha = hoyISO();

  const [datos, setDatos] = useState<EstadoAgua>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // La ruta SIEMPRE parte de municipios/{municipioId}, y el id sale del
  // token de sesion. Ver el checklist de PRs, seccion 8 del documento
  // de arquitectura.
  const ruta = municipioId ? `municipios/${municipioId}/agua/${fecha}` : null;

  useEffect(() => {
    if (!ruta) return;
    return onSnapshot(
      doc(db, ruta),
      (snap) => {
        if (snap.exists()) setDatos({ ...VACIO, ...(snap.data() as EstadoAgua) });
        setCargando(false);
      },
      () => {
        setError('No se pudo leer el estado del agua.');
        setCargando(false);
      }
    );
  }, [ruta]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!ruta) return;
    setGuardando(true);
    setMensaje(null);
    setError(null);
    try {
      await setDoc(
        doc(db, ruta),
        { ...datos, presion: Number(datos.presion), actualizadoEn: serverTimestamp() },
        { merge: true }
      );
      setMensaje('Guardado. Los vecinos ya lo ven en la app.');
    } catch {
      setError('No se pudo guardar. Revisa que tu cuenta tenga rol de funcionario.');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="secundario">Cargando...</p>;

  return (
    <form className="tarjeta" onSubmit={guardar} style={{ display: 'grid', gap: 'var(--e16)', maxWidth: 520 }}>
      <div>
        <h2>Estado del agua</h2>
        <p className="secundario" style={{ margin: '4px 0 0', fontSize: 13 }}>
          {fecha} · se publica en tiempo real
        </p>
      </div>

      <div>
        <label htmlFor="estado">Servicio</label>
        <select id="estado" value={datos.estado}
                onChange={(e) => setDatos({ ...datos, estado: e.target.value as EstadoAgua['estado'] })}>
          <option value="activo">Activo</option>
          <option value="sin-servicio">Sin servicio</option>
        </select>
      </div>

      <div>
        <label htmlFor="horario">Horario del dia</label>
        <input id="horario" placeholder="06:00 - 12:00" value={datos.horario}
               onChange={(e) => setDatos({ ...datos, horario: e.target.value })} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--e12)' }}>
        <div>
          <label htmlFor="presion">Presion (bar)</label>
          <input id="presion" type="number" step="0.1" min="0" value={datos.presion}
                 onChange={(e) => setDatos({ ...datos, presion: Number(e.target.value) })} />
        </div>
        <div>
          <label htmlFor="calidad">Calidad</label>
          <input id="calidad" value={datos.calidad}
                 onChange={(e) => setDatos({ ...datos, calidad: e.target.value })} />
        </div>
        <div>
          <label htmlFor="cobertura">Cobertura</label>
          <input id="cobertura" value={datos.cobertura}
                 onChange={(e) => setDatos({ ...datos, cobertura: e.target.value })} />
        </div>
      </div>

      {mensaje && <div className="aviso aviso-exito">{mensaje}</div>}
      {error && <div className="aviso aviso-error">{error}</div>}

      <button type="submit" disabled={guardando}>
        {guardando ? 'Guardando...' : 'Publicar'}
      </button>
    </form>
  );
}
