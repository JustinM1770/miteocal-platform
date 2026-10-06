import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** true cuando .env.local todavía no está lleno — el panel corre en modo demo */
export const firebaseListo = Boolean(config.apiKey && config.projectId);

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

export const MUNICIPIO_ID = process.env.NEXT_PUBLIC_MUNICIPIO_ID || "teocaltiche";
export const MUNICIPIO_NOMBRE = process.env.NEXT_PUBLIC_MUNICIPIO_NOMBRE || "Teocaltiche";
