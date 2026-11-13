import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { collection, doc, getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/* Cuenta de prueba: con Firebase conectado, quien entra como demo@nodex.mx
   recorre el panel con los datos de ejemplo en memoria, sin tocar la base. */
const CLAVE_DEMO = "nodex-demo";
export const CORREO_DEMO = "demo@nodex.mx";
export const cuentaDePrueba = typeof window !== "undefined" && (() => {
  try { return localStorage.getItem(CLAVE_DEMO) === "1"; } catch { return false; }
})();
export function entrarAlDemo() {
  try { localStorage.setItem(CLAVE_DEMO, "1"); } catch { /* sin almacenamiento no hay demo */ }
  window.location.href = "/panel";
}
export function salirDelDemo() {
  try { localStorage.removeItem(CLAVE_DEMO); } catch { /* nada que limpiar */ }
  window.location.href = "/login";
}

/** false cuando .env.local no está lleno o se entró con la cuenta de prueba — el panel corre en modo demo */
export const firebaseListo = Boolean(config.apiKey && config.projectId) && !cuentaDePrueba;

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

if (firebaseListo) {
  app = getApps().length ? getApp() : initializeApp(config as Required<typeof config>);
  _auth = getAuth(app);
  _db = getFirestore(app);
}

export const auth = _auth;
export const db = _db;

/* ─── Municipio de la sesión ────────────────────────────────
   Sale del custom claim `municipioId` del token (lib/auth.tsx), nunca de
   la URL ni de algo que mande el cliente. Ver docs/arquitectura-multimunicipio.md.
   En modo demo se usa el municipio de ejemplo. */
let municipio = "demo";

export const municipioId = () => municipio;
export function fijarMunicipio(id: string) { municipio = id; }

/** Colección dentro del municipio: municipios/{id}/{ruta…} */
export const coleccion = (ruta: string, ...resto: string[]) => collection(_db!, "municipios", municipio, ruta, ...resto);
/** Documento dentro del municipio: municipios/{id}/{ruta…} */
export const documento = (ruta: string, ...resto: string[]) => doc(_db!, "municipios", municipio, ruta, ...resto);
