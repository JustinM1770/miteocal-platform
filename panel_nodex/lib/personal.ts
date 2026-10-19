import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseListo } from "./firebase";
import { listarPersonal, registrar, type Usuario } from "./datos";

/* Alta y cambios del personal. El rol y el municipio son custom claims: solo
   los asigna el servidor (Cloud Functions crearPersonal / actualizarPersonal,
   en backend/functions). En modo demo se simula en memoria. */

export type RolPersonal = "funcionario" | "admin";
export interface Persona extends Usuario { correo?: string; activo?: boolean }

let demo: Persona[] | null = null;
const lista = async () => (demo ??= (await listarPersonal()).map((u, i) => ({ ...u, correo: `${u.nombre.toLowerCase().replace(/[^a-z]+/g, ".")}@ejemplo.mx`, activo: i !== 3 })));

export async function personal(): Promise<Persona[]> {
  if (!firebaseListo) return [...(await lista())];
  return (await listarPersonal()) as Persona[];
}

/** Mensaje entendible si las funciones no están desplegadas o se niega el permiso */
function explicar(e: unknown): Error {
  const code = (e as { code?: string }).code ?? "";
  const msg = (e as { message?: string }).message ?? "";
  if (code === "functions/not-found" || code === "functions/unavailable" || code === "functions/internal" && !msg)
    return new Error("Las Cloud Functions del backend no están desplegadas todavía. Mientras, usa el comando de abajo.");
  if (code === "functions/permission-denied") return new Error("Solo un administrador de este municipio puede hacerlo.");
  return new Error(msg || "No se pudo completar.");
}

const llamar = async <T, R>(nombre: string, datos: T): Promise<R> => {
  try {
    const r = await httpsCallable<T, R>(getFunctions(getApp()), nombre)(datos);
    return r.data;
  } catch (e) { throw explicar(e); }
};

export async function darDeAlta(datos: { correo: string; nombre: string; rol: RolPersonal; area: string | null }, autor: string): Promise<{ enlace: string; nueva: boolean }> {
  if (!firebaseListo) {
    const l = await lista();
    if (l.some((p) => p.correo === datos.correo)) throw new Error("Esa cuenta ya existe.");
    l.unshift({ id: `u${Date.now()}`, nombre: datos.nombre || datos.correo.split("@")[0], rol: datos.rol, area: datos.area ?? "", correo: datos.correo, activo: true });
    await registrar("Dio de alta personal", `${datos.correo} · ${datos.rol}`, "interno", autor);
    return { enlace: "https://ejemplo.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=DEMO", nueva: true };
  }
  return llamar("crearPersonal", datos);
}

export async function cambiarPersonal(uid: string, cambios: { rol?: RolPersonal; area?: string | null; activo?: boolean }, autor: string, yo: string): Promise<void> {
  if (uid === yo && (cambios.activo === false || cambios.rol)) throw new Error("No puedes quitarte tus propios permisos.");
  if (!firebaseListo) {
    const p = (await lista()).find((x) => x.id === uid);
    if (p) Object.assign(p, { ...cambios, area: cambios.area === undefined ? p.area : cambios.area ?? "" });
    await registrar("Cambió permisos de personal", `${p?.correo ?? uid}`, "interno", autor);
    return;
  }
  await llamar("actualizarPersonal", { uid, ...cambios });
}
