"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";

/* Lee QR con la cámara (o de una foto) usando BarcodeDetector, que traen
   Chrome y Edge en Android, Windows y macOS. Donde no existe (Safari,
   Firefox), se escribe el folio a mano. */

type Detector = { detect: (fuente: CanvasImageSource | ImageBitmap) => Promise<{ rawValue: string }[]> };
const crearDetector = (): Detector | null => {
  const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  return BD ? new BD({ formats: ["qr_code"] }) : null;
};
export const escanerDisponible = () => typeof window !== "undefined" && "BarcodeDetector" in window;

export default function EscanerQR({ onLeido, onCerrar }: { onLeido: (texto: string) => void; onCerrar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detector = crearDetector();
    if (!detector) { setError("Este navegador no lee QR. Usa Chrome o escribe el folio."); return; }
    let flujo: MediaStream | null = null;
    let activo = true;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
      .then(async (s) => {
        flujo = s;
        if (!video.current) return;
        video.current.srcObject = s;
        await video.current.play();
        const ciclo = async () => {
          if (!activo || !video.current) return;
          try {
            const r = await detector.detect(video.current);
            if (r[0]?.rawValue) { activo = false; onLeido(r[0].rawValue); return; }
          } catch { /* cuadro sin QR */ }
          requestAnimationFrame(ciclo);
        };
        ciclo();
      })
      .catch(() => setError("No se pudo abrir la cámara. Revisa el permiso del navegador o sube una foto del QR."));
    return () => { activo = false; flujo?.getTracks().forEach((t) => t.stop()); };
  }, [onLeido]);

  return (
    <Modal titulo="Escanear pase" onCerrar={onCerrar} ancho={460}>
      <div className="col" style={{ gap: 12 }}>
        {error ? <span style={{ color: "var(--danger)" }}>{error}</span> : (
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000" }}>
            <video ref={video} muted playsInline style={{ width: "100%", display: "block" }} />
            <div style={{ position: "absolute", inset: "18%", border: "3px solid rgba(255,255,255,0.85)", borderRadius: 16 }} aria-hidden />
          </div>
        )}
        <span className="muted" style={{ fontSize: 12 }}>Apunta al QR del pase digital del vecino.</span>
        <button className="btn ghost" type="button" onClick={onCerrar}>Cancelar</button>
      </div>
    </Modal>
  );
}

/** Lee un QR desde una imagen (captura de pantalla que manda el vecino, por ejemplo) */
export async function leerQRDeImagen(archivo: File): Promise<string | null> {
  const detector = crearDetector();
  if (!detector) throw new Error("Este navegador no lee QR. Usa Chrome o escribe el folio.");
  const imagen = await createImageBitmap(archivo);
  const r = await detector.detect(imagen);
  return r[0]?.rawValue ?? null;
}
