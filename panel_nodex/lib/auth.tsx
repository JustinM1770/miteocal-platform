"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, firebaseListo } from "./firebase";

export interface Sesion {
  uid: string;
  email: string;
  nombre: string;
  rol: "admin" | "operador";
  area: string;
}

/** Sesión de muestra cuando no hay Firebase configurado todavía */
const SESION_DEMO: Sesion = {
  uid: "demo",
  email: "laura.m@teocaltiche.gob.mx",
  nombre: "Laura M.",
  // admin en demo para poder recorrer todas las pantallas, administración incluida
  rol: "admin",
  area: "Agua Potable",
};

interface Ctx {
  sesion: Sesion | null;
  cargando: boolean;
  entrar: (email: string, pass: string) => Promise<void>;
  salir: () => Promise<void>;
  modoDemo: boolean;
}

const AuthCtx = createContext<Ctx>({
  sesion: null, cargando: true, modoDemo: true,
  entrar: async () => {}, salir: async () => {},
});

async function aSesion(u: User): Promise<Sesion> {
  // El rol y el área viven en la colección `usuarios` (id = uid de Auth).
  // Si la persona todavía no tiene documento, entra como operador sin área.
  const perfil = db ? (await getDoc(doc(db, "usuarios", u.uid)).catch(() => null))?.data() : undefined;
  return {
    uid: u.uid,
    email: u.email ?? "",
    nombre: perfil?.nombre || u.displayName || (u.email ?? "").split("@")[0],
    rol: perfil?.rol === "admin" ? "admin" : "operador",
    area: perfil?.area || "Sin área asignada",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!firebaseListo || !auth) {
      setCargando(false);
      return;
    }
    return onAuthStateChanged(auth, async (u) => {
      setSesion(u ? await aSesion(u) : null);
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
    setSesion(await aSesion(cred.user));
  }

  async function salir() {
    if (!firebaseListo || !auth) { setSesion(null); return; }
    await fbSignOut(auth);
  }

  return (
    <AuthCtx.Provider value={{ sesion, cargando, entrar, salir, modoDemo: !firebaseListo }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
