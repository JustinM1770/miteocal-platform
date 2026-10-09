"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, firebaseListo, fijarMunicipio } from "./firebase";
import { cargarConfig } from "./config";

/* El municipio y el rol salen de los custom claims del token. Solo los
   escribe el Admin SDK (backend/seed/crear-funcionario.js o una Cloud
   Function); el cliente nunca puede asignárselos. */

export type Rol = "funcionario" | "admin" | "plataforma";

export interface Sesion {
  uid: string;
  email: string;
  nombre: string;
  rol: Rol;
  area: string;
  municipioId: string;
}

/** Por qué una cuenta válida de Firebase no puede usar el panel */
export interface SinAcceso { uid: string; email: string; motivo: "sin-rol" | "sin-municipio" | "error-config"; detalle?: string }

export const esAdmin = (s: Sesion | null) => s?.rol === "admin" || s?.rol === "plataforma";
export const NOMBRE_ROL: Record<Rol, string> = { funcionario: "Funcionario", admin: "Administrador", plataforma: "Plataforma" };

/** Sesión de muestra cuando no hay Firebase configurado todavía */
const SESION_DEMO: Sesion = {
  uid: "demo", email: "laura.m@ejemplo.mx", nombre: "Laura M.",
  // admin en demo para poder recorrer todas las pantallas, administración incluida
  rol: "admin", area: "Agua Potable", municipioId: "demo",
};

interface Ctx {
  sesion: Sesion | null;
  sinAcceso: SinAcceso | null;
  cargando: boolean;
  entrar: (email: string, pass: string) => Promise<void>;
  salir: () => Promise<void>;
  modoDemo: boolean;
}

const AuthCtx = createContext<Ctx>({
  sesion: null, sinAcceso: null, cargando: true, modoDemo: true,
  entrar: async () => {}, salir: async () => {},
});

async function aSesion(u: User): Promise<{ sesion: Sesion | null; sinAcceso: SinAcceso | null }> {
  // true: fuerza un token nuevo, por si los claims se asignaron después de iniciar sesión
  const { claims } = await u.getIdTokenResult(true);
  const rol = claims.rol as string | undefined;
  const municipioId = claims.municipioId as string | undefined;
  const base = { uid: u.uid, email: u.email ?? "" };

  if (!rol || !["funcionario", "admin", "plataforma"].includes(rol)) return { sesion: null, sinAcceso: { ...base, motivo: "sin-rol" } };
  if (!municipioId) return { sesion: null, sinAcceso: { ...base, motivo: "sin-municipio" } };

  fijarMunicipio(municipioId);
  try {
    await cargarConfig();
  } catch (e) {
    return { sesion: null, sinAcceso: { ...base, motivo: "error-config", detalle: (e as Error).message } };
  }
  // El perfil (nombre) lo puede leer la propia persona; el rol NUNCA sale de aquí
  const perfil = db ? (await getDoc(doc(db, "usuarios", u.uid)).catch(() => null))?.data() : undefined;
  return {
    sinAcceso: null,
    sesion: {
      ...base,
      nombre: perfil?.nombre || u.displayName || base.email.split("@")[0],
      rol: rol as Rol,
      area: (claims.area as string) || perfil?.area || "",
      municipioId,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [sinAcceso, setSinAcceso] = useState<SinAcceso | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!firebaseListo || !auth) {
      setCargando(false);
      return;
    }
    return onAuthStateChanged(auth, async (u) => {
      const r = u ? await aSesion(u) : { sesion: null, sinAcceso: null };
      setSesion(r.sesion); setSinAcceso(r.sinAcceso);
      setCargando(false);
    });
  }, []);

  async function entrar(email: string, pass: string) {
    if (!firebaseListo || !auth) {
      // Modo demo: cualquier contraseña entra, para poder ver el panel sin configurar nada
      setSesion({ ...SESION_DEMO, email });
      return;
    }
    // La sesión se arma aquí mismo (no esperando a onAuthStateChanged) para que
    // el panel no vea «sin sesión» un instante y regrese al login
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const r = await aSesion(cred.user);
    setSesion(r.sesion); setSinAcceso(r.sinAcceso);
  }

  async function salir() {
    setSinAcceso(null);
    if (!firebaseListo || !auth) { setSesion(null); return; }
    await fbSignOut(auth);
  }

  return (
    <AuthCtx.Provider value={{ sesion, sinAcceso, cargando, entrar, salir, modoDemo: !firebaseListo }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
