"use client";

import { useState } from "react";
import { ETIQUETA_ESTADO, type Estado, type Publicacion } from "@/lib/datos";

const MOTIVOS = [
  "El servicio se restableció antes de lo previsto",
  "La hora estimada cambió",
  "El dato se publicó con un error",
  "La colonia afectada no era la correcta",
];

export default function ModalCorregir({
  actual, onCancelar, onConfirmar,
}: {
  actual: Publicacion;
  onCancelar: () => void;
  onConfirmar: (d: { estado: Estado; horaEstimada: string | null; motivo: string; renotificar: boolean }) => Promise<void>;
}) {
  const [estado, setEstado] = useState<Estado>(actual.estado === "sin_servicio" ? "activo" : "sin_servicio");
  const [hora, setHora] = useState<string>("");
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [renotificar, setRenotificar] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const nuevoTexto = estado === "activo" ? "El servicio ya volvió"
    : estado === "sin_dato" ? "Sin información del pozo"
    : hora ? `Vuelve hoy ~${hora}` : "Sin estimación de regreso";

  return (
    <div className="scrim" onClick={onCancelar}>
      <div className="modal" style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="col" style={{ gap: 16 }}>
          <div className="col" style={{ gap: 5 }}>
            <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Corregir el dato publicado</h3>
            <div className="muted" style={{ fontSize: 13 }}>
              {actual.titulo} · publicado por {actual.autorNombre}
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div className="col grow" style={{ gap: 7, background: "var(--subtle)", borderRadius: 12, padding: 14 }}>
              <span className="section-label">LOS VECINOS ESTÁN VIENDO</span>
              <span className={`pill ${actual.estado ?? "sin_dato"}`} style={{ alignSelf: "flex-start" }}>
                {ETIQUETA_ESTADO[actual.estado ?? "sin_dato"].toUpperCase()}
              </span>
              <strong style={{ fontSize: 17 }}>
                {actual.horaEstimada ? `Vuelve hoy ~${actual.horaEstimada}` : actual.mensaje}
              </strong>
            </div>
            <div className="col grow" style={{ gap: 7, background: "var(--ok-soft)", borderRadius: 12, padding: 14 }}>
              <span className="section-label">QUEDARÁ ASÍ</span>
              <span className={`pill ${estado}`} style={{ alignSelf: "flex-start" }}>
                {ETIQUETA_ESTADO[estado].toUpperCase()}
              </span>
              <strong style={{ fontSize: 17 }}>{nuevoTexto}</strong>
            </div>
          </div>

          <div className="options">
            {(["activo", "sin_servicio", "sin_dato"] as Estado[]).map((e) => (
              <button key={e} type="button"
                className={`option${estado === e ? ` on ${e}` : ""}`}
                onClick={() => setEstado(e)}>
                <span className="radio" />
                {ETIQUETA_ESTADO[e]}
              </button>
            ))}
          </div>

          {estado === "sin_servicio" && (
            <div className="field">
              <label className="section-label">NUEVA HORA ESTIMADA</label>
              <input className="input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          )}

          <div className="field">
            <label className="section-label">MOTIVO DE LA CORRECCIÓN · OBLIGATORIO</label>
            <select className="select" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <span className="muted" style={{ fontSize: 12 }}>
              Queda registrado en la bitácora de auditoría con tu nombre.
            </span>
          </div>

          <div className="banner warn">
            <div className="col" style={{ gap: 2 }}>
              <strong>Avisar de la corrección</strong>
              <span className="muted" style={{ fontSize: 12 }}>
                Sería la segunda notificación de hoy a {actual.colonia}. Úsala solo si el cambio les importa.
              </span>
            </div>
            <button type="button" className={`toggle${renotificar ? " on" : ""}`}
              aria-pressed={renotificar} onClick={() => setRenotificar((v) => !v)}>
              <span className="knob" />
            </button>
          </div>

          <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button className="btn ghost" onClick={onCancelar} type="button">Cancelar</button>
            <button className="btn primary" disabled={enviando} type="button"
              onClick={async () => {
                setEnviando(true);
                await onConfirmar({ estado, horaEstimada: hora || null, motivo, renotificar });
              }}>
              {enviando ? "Publicando…" : "Publicar corrección"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
