"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Dibuja un QR (nivel de corrección M: aguanta una pantalla rayada o con brillo) */
export default function CodigoQR({ texto, tamano = 180, etiqueta }: { texto: string; tamano?: number; etiqueta: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    QRCode.toDataURL(texto, { errorCorrectionLevel: "M", margin: 1, width: tamano * 2, color: { dark: "#0e1116", light: "#ffffff" } })
      .then((u) => vivo && setSrc(u)).catch(() => vivo && setSrc(null));
    return () => { vivo = false; };
  }, [texto, tamano]);
  return src
    ? <img src={src} width={tamano} height={tamano} alt={etiqueta} style={{ display: "block", margin: "0 auto", imageRendering: "pixelated" }} />
    : <div style={{ width: tamano, height: tamano, margin: "0 auto", background: "var(--subtle)", borderRadius: 8 }} aria-label="Generando QR" />;
}
