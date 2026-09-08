import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, usandoEmuladores } from '../firebase/cliente';

export function Entrar() {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await signInWithEmailAndPassword(auth, correo, clave);
    } catch {
      // Mensaje generico a proposito: no revelar si el correo existe.
      setError('Correo o contrasena incorrectos.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 'var(--e20)' }}>
      <form className="tarjeta" onSubmit={alEnviar} style={{ width: 360, display: 'grid', gap: 'var(--e16)' }}>
        <div>
          <h1>Panel del municipio</h1>
          <p className="secundario" style={{ margin: '4px 0 0' }}>
            Acceso para personal autorizado.
          </p>
        </div>

        <div>
          <label htmlFor="correo">Correo</label>
          <input id="correo" type="email" required autoComplete="username"
                 value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </div>

        <div>
          <label htmlFor="clave">Contrasena</label>
          <input id="clave" type="password" required autoComplete="current-password"
                 value={clave} onChange={(e) => setClave(e.target.value)} />
        </div>

        {error && <div className="aviso aviso-error">{error}</div>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>

        {usandoEmuladores && (
          <p className="secundario" style={{ fontSize: 11, margin: 0 }}>
            Conectado a los emuladores locales.
          </p>
        )}
      </form>
    </main>
  );
}
