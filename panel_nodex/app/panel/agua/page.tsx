"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import ModalConfirmar from "@/components/ModalConfirmar";
import CompartirRedes from "@/components/CompartirRedes";
import {
  COLONIAS, ZONAS, ETIQUETA_ESTADO, MENSAJES_RAPIDOS, alcanceDe, publicar, type Estado,
} from "@/lib/datos";

const CADUCIDAD_HORAS = 24;

export default function PublicarAgua() {
  const { sesion } = useAuth();
  const router = useRouter();

  const [colonia, setColonia] = useState(COLONIAS[0].nombre);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [hora, setHora] = useState("");
  const [sinEstimacion, setSinEstimacion] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [notificar, setNotificar] = useState(true);
  const [programar, setProgramar] = useState(false);
  const [cuando, setCuando] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const alcance = alcanceDe(colonia);
  const programadoPara = programar && cuando ? new Date(cuando) : null;

  const titularApp =
    estado === "activo" ? "El servicio está funcionando"
    : estado === "sin_dato" ? "Sin información del pozo"
    : sinEstimacion || !hora ? "Sin estimación de regreso"
    : `Vuelve hoy ~${hora}`;

  const tituloPush =
    estado === "activo" ? `Ya hay agua en ${colonia}`
    : estado === "sin_dato" ? `Sin información del pozo · ${colonia}`
    : `Sin agua en ${colonia}`;

  // El formulario no se puede enviar a medias: sin estado, o sin hora cuando hace falta
  const faltaHora = estado === "sin_servicio" && !hora && !sinEstimacion;
  const listo = Boolean(estado) && !faltaHora && mensaje.trim().length > 0 && (!programar || Boolean(cuando));

  async function guardar() {
    await publicar({
      tipo: "agua", canal: "publico", colonia, estado,
      titulo: `Agua · ${colonia}`,
      mensaje: mensaje.trim(),
      horaEstimada: estado === "sin_servicio" && !sinEstimacion ? hora || null : null,
      publicarEn: programadoPara ?? new Date(),
      caducaEn: new Date((programadoPara?.getTime() ?? Date.now()) + CADUCIDAD_HORAS * 3600_000),
      notificar, alcance,
      autorNombre: sesion!.nombre, autorUid: sesion!.uid,
    });
    setConfirmando(false);
    setGuardado(true);
    setTimeout(() => router.push("/panel"), 700);
  }

  return (
    <>
      <div className="row">
        <div className="col grow" style={{ gap: 18 }}>
          <div className="card col" style={{ gap: 20 }}>
            <h3 className="h3">Datos de la publicación</h3>

            <div className="field">
              <label className="section-label">COLONIA</label>
              <select className="select" value={colonia} onChange={(e) => setColonia(e.target.value)}>
                {ZONAS.map((z) => (
                  <optgroup key={z} label={z}>
                    {COLONIAS.filter((c) => c.zona === z).map((c) => (
                      <option key={c.nombre} value={c.nombre}>{c.nombre}{c.horario ? ` · ${c.horario}` : ""}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="section-label">ESTADO DEL SERVICIO</label>
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
            </div>

            {estado === "sin_servicio" && (
              <div className="field">
                <label className="section-label">HORA ESTIMADA DE REGRESO</label>
                <span className="muted" style={{ fontSize: 12 }}>
                  Si no la sabes, deja «sin estimación». Es peor dar una hora falsa.
                </span>
                <div className="row" style={{ gap: 10 }}>
                  <input className="input grow" type="time" value={hora} disabled={sinEstimacion}
                    onChange={(e) => setHora(e.target.value)} />
                  <button type="button"
                    className={`option${sinEstimacion ? " on sin_dato" : ""}`}
                    style={{ flex: "0 0 auto" }}
                    onClick={() => { setSinEstimacion((v) => !v); setHora(""); }}>
                    <span className="radio" style={{ borderRadius: 4 }} />
                    Sin estimación
                  </button>
                </div>
              </div>
            )}

            <div className="field">
              <label className="section-label">MENSAJE PARA LOS VECINOS</label>
              <div className="chips">
                {MENSAJES_RAPIDOS.map((m) => (
                  <button key={m} type="button" className="chip" onClick={() => setMensaje(m)}>
                    {m.length > 34 ? m.slice(0, 32) + "…" : m}
                  </button>
                ))}
              </div>
              <textarea className="textarea" value={mensaje} onChange={(e) => setMensaje(e.target.value)}
                placeholder="Qué pasó, en lenguaje de vecino. Una o dos frases." />
            </div>
          </div>

          <div className="card col" style={{ gap: 14 }}>
            <div className="banner info" style={{ gap: 10 }}>
              <span className="pill" style={{ background: "var(--brand)", color: "#fff" }}>PÚBLICO</span>
              <span className="grow" style={{ fontWeight: 500 }}>
                Esta publicación sale a la app. La verán todos los vecinos de {colonia}.
              </span>
            </div>

            <div className="row" style={{ alignItems: "center", gap: 14 }}>
              <div className="col grow" style={{ gap: 2 }}>
                <strong>Enviar notificación al teléfono</strong>
                <span className="muted" style={{ fontSize: 13 }}>
                  {alcance} vecinos recibirán una alerta. No se puede deshacer.
                </span>
              </div>
              <button type="button" className={`toggle${notificar ? " on" : ""}`}
                aria-pressed={notificar} onClick={() => setNotificar((v) => !v)}>
                <span className="knob" />
              </button>
            </div>

            <div className="row" style={{ alignItems: "center", gap: 14, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <div className="col grow" style={{ gap: 2 }}>
                <strong>Programar la publicación</strong>
                <span className="muted" style={{ fontSize: 13 }}>
                  Déjalo cargado y sale solo a la hora que elijas.
                </span>
              </div>
              <button type="button" className={`toggle${programar ? " on" : ""}`}
                aria-pressed={programar} onClick={() => setProgramar((v) => !v)}>
                <span className="knob" />
              </button>
            </div>

            {programar && (
              <input className="input" type="datetime-local" value={cuando}
                onChange={(e) => setCuando(e.target.value)} />
            )}
          </div>

          <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button className="btn ghost" type="button" onClick={() => router.push("/panel")}>Cancelar</button>
            <button className="btn ghost" type="button" disabled={!listo}
              onClick={async () => { setNotificar(false); await guardar(); }}>
              Guardar sin notificar
            </button>
            <button className="btn primary" type="button" disabled={!listo}
              onClick={() => (notificar ? setConfirmando(true) : guardar())}>
              {guardado ? "Publicado" : programar ? "Programar publicación" : "Publicar y notificar"}
            </button>
          </div>
        </div>

        <div className="col" style={{ width: 380, flex: "0 0 380px", gap: 12 }}>
          <span className="section-label">ASÍ SE VERÁ EN LA APP</span>

          <div className="card col" style={{ gap: 10, borderRadius: 20 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span className="section-label">AGUA · {colonia.toUpperCase()}</span>
              {estado && <span className={`pill ${estado}`}>{ETIQUETA_ESTADO[estado].toUpperCase()}</span>}
            </div>
            <strong style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
              {estado ? titularApp : "Elige un estado"}
            </strong>
            <span className="muted" style={{ fontSize: 13 }}>
              {mensaje || "El mensaje aparecerá aquí."}
            </span>
            <span className="muted" style={{ fontSize: 11, fontWeight: 500 }}>
              {programadoPara
                ? `Se publicará el ${programadoPara.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                : "Actualizado hace unos segundos"}
            </span>
          </div>

          {notificar && estado && (
            <div className="card col" style={{ gap: 4 }}>
              <span className="section-label">NODEX · AHORA</span>
              <strong>{tituloPush}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{mensaje || "—"}</span>
            </div>
          )}

          {estado && mensaje && (
            <CompartirRedes titulo={tituloPush} cuerpo={mensaje} colonia={colonia} />
          )}
        </div>
      </div>

      {confirmando && (
        <ModalConfirmar
          colonia={colonia} alcance={alcance} titulo={tituloPush}
          cuerpo={mensaje} programadoPara={programadoPara}
          onCancelar={() => setConfirmando(false)}
          onConfirmar={guardar}
        />
      )}
    </>
  );
}
