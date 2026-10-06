"use client";

import { useState } from "react";

export default function ModalConfirmar({
  colonia, alcance, titulo, cuerpo, programadoPara, onCancelar, onConfirmar,
}: {
  colonia: string;
  alcance: number;
  titulo: string;
  cuerpo: string;
  programadoPara: Date | null;
  onCancelar: () => void;
  onConfirmar: () => Promise<void>;
}) {
  const [enviando, setEnviando] = useState(false);

  return (
    <div className="scrim" onClick={onCancelar}>
      <div className="modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="col" style={{ gap: 16 }}>
          <div className="col" style={{ gap: 6 }}>
            <div className="row" style={{ alignItems: "center", gap: 9 }}>
              <span className="pill" style={{ background: "var(--brand)", color: "#fff" }}>
                PÚBLICO · CIUDADANOS
              </span>
              <span className="muted" style={{ fontWeight: 600, fontSize: 12 }}>{colonia}</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
              {programadoPara
                ? `Se enviará a ${alcance} teléfonos el ${programadoPara.toLocaleString("es-MX", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`
                : `Vas a enviar una notificación a ${alcance} teléfonos`}
            </h3>
          </div>

          <span className="muted" style={{ fontSize: 13 }}>Así la va a recibir cada vecino:</span>

          <div className="col" style={{ gap: 4, background: "var(--subtle)", borderRadius: 14, padding: "15px 18px" }}>
            <span className="section-label">NODEX · AHORA</span>
            <strong style={{ fontSize: 15 }}>{titulo}</strong>
            <span className="muted" style={{ fontSize: 13 }}>{cuerpo}</span>
          </div>

          <div className="banner warn" style={{ display: "block" }}>
            <strong style={{ fontSize: 13 }}>Esto no se puede deshacer</strong>
            <div className="muted" style={{ fontSize: 12 }}>
              Si el dato está mal, tendrás que publicar una corrección y volver a notificar.
            </div>
          </div>

          <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button className="btn ghost" onClick={onCancelar} type="button">Cancelar</button>
            <button className="btn primary" disabled={enviando} type="button"
              onClick={async () => { setEnviando(true); await onConfirmar(); }}>
              {enviando ? "Enviando…" : programadoPara ? "Sí, programar envío" : `Sí, enviar a ${alcance} vecinos`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
