"use client";

import { useState } from "react";

/**
 * Puente manual a redes sociales.
 *
 * No publica por API: arma el texto listo y lo copia al portapapeles para que
 * quien lleva las redes del ayuntamiento lo pegue. Publicar directo en Facebook
 * o Instagram exige la Graph API de Meta, una Página (no perfil) del municipio,
 * revisión de app por parte de Meta y un token de alguien con permisos de
 * administrador en esa Página. Eso es fase 2; esto funciona desde el día uno.
 */
export default function CompartirRedes({
  titulo, cuerpo, colonia,
}: { titulo: string; cuerpo: string; colonia: string }) {
  const [copiado, setCopiado] = useState<string | null>(null);

  const texto = `${titulo.toUpperCase()}\n\n${cuerpo}\n\nConsulta el estado en tiempo real en la app Nodex.\n\n#${colonia.replace(/\s/g, "")} #Teocaltiche`;

  async function copiar(destino: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(destino);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      setCopiado("error");
    }
  }

  return (
    <div className="card col" style={{ gap: 10 }}>
      <span className="section-label">TAMBIÉN EN REDES</span>
      <span className="muted" style={{ fontSize: 12 }}>
        Copia el texto ya armado y pégalo en la página del ayuntamiento.
      </span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost grow" type="button" onClick={() => copiar("fb")}>
          {copiado === "fb" ? "Copiado ✓" : "Copiar para Facebook"}
        </button>
        <button className="btn ghost grow" type="button" onClick={() => copiar("wa")}>
          {copiado === "wa" ? "Copiado ✓" : "Copiar para WhatsApp"}
        </button>
      </div>
      {copiado === "error" && (
        <span className="muted" style={{ fontSize: 12 }}>
          El navegador bloqueó el portapapeles. Selecciona el texto de la vista previa.
        </span>
      )}
    </div>
  );
}
