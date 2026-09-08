import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './cliente';

export type Rol = 'vecino' | 'funcionario' | 'admin' | 'plataforma';

export interface Sesion {
  usuario: User | null;
  /** Viene del custom claim del token, NUNCA de un parametro del cliente.
   *  Ver docs/arquitectura-multimunicipio.md seccion 4. */
  municipioId: string | null;
  rol: Rol | null;
  cargando: boolean;
  salir: () => Promise<void>;
}

const Contexto = createContext<Sesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [municipioId, setMunicipioId] = useState<string | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUsuario(u);
      if (u) {
        const token = await u.getIdTokenResult();
        setMunicipioId((token.claims.municipioId as string) ?? null);
        setRol((token.claims.rol as Rol) ?? null);
      } else {
        setMunicipioId(null);
        setRol(null);
      }
      setCargando(false);
    });
  }, []);

  const valor: Sesion = {
    usuario,
    municipioId,
    rol,
    cargando,
    salir: () => signOut(auth),
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): Sesion {
  const s = useContext(Contexto);
  if (!s) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return s;
}

export function puedeAdministrar(rol: Rol | null): boolean {
  return rol === 'funcionario' || rol === 'admin';
}
