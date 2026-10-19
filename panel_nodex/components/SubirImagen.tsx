"use client";

import { useId, useState } from "react";
import { subirImagen, validarImagen, type Carpeta } from "@/lib/archivos";

/** Campo para subir una imagen a Storage; devuelve la URL pública */
export default function SubirImagen({ carpeta, id, valor, onCambio, etiqueta = "Imagen" }: {
  carpeta: Carpeta; id: string; valor: string; onCambio: (url: string) => void; etiqueta?: string;
}) {
  const [avance, setAvance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idInput = useId();

  async function elegir(f: File | undefined) {
    if (!f) return;
    const e = validarImagen(f);
    if (e) { setError(e); return; }
    setError(null); setAvance(0);
    try {
      onCambio(await subirImagen(carpeta, id || "sin-id", f, setAvance));
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setError(code === "storage/unauthorized" ? "No tienes permiso para subir imágenes." : code.startsWith("storage/") ? "Storage no está activo en el proyecto todavía." : (err as Error).message);
    } finally { setAvance(null); }
  }

  return (
    <div className="field">
      <label className="section-label" htmlFor={idInput}>{etiqueta.toUpperCase()} · OPCIONAL</label>
      <div className="row" style={{ gap: 12, alignItems: "center" }}>
        <div style={{ width: 96, height: 64, flex: "0 0 96px", borderRadius: 10, border: "1px solid var(--border)", background: valor ? `center/cover url(${valor})` : "var(--subtle)" }} aria-hidden />
        <div className="col" style={{ gap: 4 }}>
          <input id={idInput} type="file" accept="image/*" disabled={avance !== null} onChange={(e) => elegir(e.target.files?.[0])} />
          {avance !== null && <span className="muted" style={{ fontSize: 12 }}>Subiendo… {Math.round(avance * 100)}%</span>}
          {valor && avance === null && <button type="button" className="btn ghost" style={{ padding: "4px 8px", alignSelf: "flex-start" }} onClick={() => onCambio("")}>Quitar imagen</button>}
          {error && <span style={{ color: "var(--danger)", fontSize: 12 }}>{error}</span>}
        </div>
      </div>
    </div>
  );
}
