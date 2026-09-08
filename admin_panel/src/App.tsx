import { useSesion, puedeAdministrar } from './firebase/sesion';
import { Entrar } from './paginas/Entrar';
import { Agua } from './paginas/Agua';

export default function App() {
  const { usuario, municipioId, rol, cargando, salir } = useSesion();

  if (cargando) {
    return <main style={{ padding: 'var(--e20)' }} className="secundario">Cargando...</main>;
  }

  if (!usuario) return <Entrar />;

  // El rol y el municipio salen del custom claim. Una cuenta recien creada
  // todavia no los tiene: los escribe la Cloud Function asignarMunicipio.
  if (!puedeAdministrar(rol) || !municipioId) {
    return (
      <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 'var(--e20)' }}>
        <div className="tarjeta" style={{ maxWidth: 420, display: 'grid', gap: 'var(--e12)' }}>
          <h2>Tu cuenta todavia no tiene acceso</h2>
          <p className="secundario" style={{ margin: 0, fontSize: 13 }}>
            Un administrador de tu municipio tiene que asignarte un rol antes de
            que puedas entrar al panel.
          </p>
          <button onClick={salir}>Salir</button>
        </div>
      </main>
    );
  }

  return (
    <div>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: 'var(--e16) var(--e20)', background: 'var(--fondo-tarjeta)',
        borderBottom: '1px solid var(--borde)',
      }}>
        <div>
          <strong>Panel · {municipioId}</strong>
          <span className="secundario" style={{ fontSize: 13, marginLeft: 8 }}>{rol}</span>
        </div>
        <button onClick={salir} style={{ background: 'transparent', color: 'var(--texto-secundario)' }}>
          Salir
        </button>
      </header>

      <main style={{ padding: 'var(--e24) var(--e20)' }}>
        <Agua />
      </main>
    </div>
  );
}
