import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getApp } from "firebase/app";
import { firebaseListo, municipioId } from "./firebase";

/* Imágenes públicas del municipio en Storage. Rutas y límites iguales a
   backend/storage.rules: municipios/{id}/{carpeta}/{id}/{archivo}, solo
   imágenes, menos de 5 MB, solo personal del municipio. */

export type Carpeta = "noticias" | "comercios" | "eventos" | "candidatas";
export const MAX_MB = 5;

export function validarImagen(f: File): string | null {
  if (!f.type.startsWith("image/")) return "Solo imágenes (JPG, PNG o WebP).";
  if (f.size >= MAX_MB * 1024 * 1024) return `La imagen pesa más de ${MAX_MB} MB.`;
  return null;
}

export async function subirImagen(carpeta: Carpeta, id: string, archivo: File, progreso?: (p: number) => void): Promise<string> {
  const error = validarImagen(archivo);
  if (error) throw new Error(error);
  // En modo demo la imagen solo vive en esta pestaña
  if (!firebaseListo) { progreso?.(1); return URL.createObjectURL(archivo); }
  const nombre = `${Date.now()}-${archivo.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-")}`;
  const destino = ref(getStorage(getApp()), `municipios/${municipioId()}/${carpeta}/${id}/${nombre}`);
  const tarea = uploadBytesResumable(destino, archivo, { contentType: archivo.type });
  await new Promise<void>((ok, mal) => tarea.on("state_changed", (s) => progreso?.(s.bytesTransferred / s.totalBytes), mal, () => ok()));
  return getDownloadURL(destino);
}
