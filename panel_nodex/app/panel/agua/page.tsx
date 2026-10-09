"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import ModalConfirmar from "@/components/ModalConfirmar";
import CompartirRedes from "@/components/CompartirRedes";
import { ETIQUETA_ESTADO, MENSAJES_RAPIDOS, aguaDeHoy, publicar, type DetalleAgua, type Estado } from "@/lib/datos";
import { alcanceDe, colonias, coloniasDeZona, textoAlcance, zonas } from "@/lib/config";

const CADUCIDAD_HORAS = 24;
type Alcance = "colonia" | "municipio";

export default function PublicarAgua() {
  const { sesion } = useAuth();
  const router = useRouter();

  // «Todo el municipio» es lo que hoy muestra la tarjeta de Inicio de la app;
  // «Una colonia» se guarda en agua/{fecha}.colonias para el detalle por colonia.
  const [alcanceTipo, setAlcanceTipo] = useState<Alcance>("municipio");
  const [colonia, setColonia] = useState(colonias()[0]?.nombre ?? "");
  const [estado, setEstado] = useState<Estado | null>(null);
  const [hora, setHora] = useState("");
  const [sinEstimacion, setSinEstimacion] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [detalle, setDetalle] = useState<DetalleAgua>({ horario: "", presion: null, calidad: "Potable", cobertura: "Total" });
  const [notificar, setNotificar] = useState(true);
  const [programar, setProgramar] = useState(false);
  const [cuando, setCuando] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  // Se parte de lo que la app ya muestra hoy, para no borrar el horario por accidente
  useEffect(() => {
    aguaDeHoy().then((a) => a && setDetalle((d) => ({
      horario: a.horario ?? d.horario, presion: typeof a.presion === "number" ? a.presion : d.presion,
      calidad: a.calidad || d.calidad, cobertura: a.cobertura || d.cobertura,
    }))).catch(() => {});
  }, []);

  const deColonia = alcanceTipo === "colonia";
  const destino = deColonia ? colonia : null;
  const alcance = alcanceDe(destino);
  const lugar = destino ?? "todo el municipio";
  const programadoPara = programar && cuando ? new Date(cuando) : null;

  const titularApp =
    estado === "activo" ? "El servicio está funcionando"
    : estado === "sin_dato" ? "Sin información del pozo"
    : sinEstimacion || !hora ? "Sin estimación de regreso"
    : `Vuelve hoy ~${hora}`;

  const tituloPush =
    estado === "activo" ? `Ya hay agua en ${lugar}`
    : estado === "sin_dato" ? `Sin información del pozo · ${lugar}`
    : `Sin agua en ${lugar}`;

  // El formulario no se puede enviar a medias: sin estado, o sin hora cuando hace falta
  const faltaHora = estado === "sin_servicio" && !hora && !sinEstimacion;
  const listo = Boolean(estado) && !faltaHora && mensaje.trim().length > 0 && (!programar || Boolean(cuando)) && (!deColonia || Boolean(colonia));

  /** `conAviso` va explícito: no depende de que el estado del toggle ya se haya actualizado */
  async function guardar(conAviso: boolean) {
    await publicar({
      tipo: "agua", canal: "publico", colonia: destino, estado,
      titulo: `Agua · ${destino ?? "Todo el municipio"}`,
      mensaje: mensaje.trim(),
      horaEstimada: estado === "sin_servicio" && !sinEstimacion ? hora || null : null,
      publicarEn: programadoPara ?? new Date(),
      caducaEn: new Date((programadoPara?.getTime() ?? Date.now()) + CADUCIDAD_HORAS * 3600_000),
      notificar: conAviso, alcance,
      autorNombre: sesion!.nombre, autorUid: sesion!.uid,
    }, { accion: "Publicó estado de agua", agua: deColonia ? undefined : detalle, push: { titulo: tituloPush, cuerpo: mensaje.trim() } });
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
              <label className="section-label">A QUIÉN AFECTA</label>
              <div className="seg">
                <button type="button" className={!deColonia ? "on azul" : ""} onClick={() => setAlcanceTipo("municipio")}>Todo el municipio</button>
                <button type="button" className={deColonia ? "on azul" : ""} onClick={() => setAlcanceTipo("colonia")} disabled={!colonias().length}>Una colonia</button>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>
                {deColonia ? "Se guarda como el estado de esa colonia; el resto del municipio no cambia." : "Es lo que todos ven en la tarjeta de agua de Inicio."}
              </span>
            </div>

            {deColonia && (
              <div className="field">
                <label className="section-label">COLONIA</label>
                <select className="select" value={colonia} onChange={(e) => setColonia(e.target.value)}>
                  {zonas().map((z) => (
                    <optgroup key={z} label={z}>
                      {coloniasDeZona(z).map((c) => (
                        <option key={c.id} value={c.nombre}>{c.nombre}{c.horario ? ` · ${c.horario}` : ""}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

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

          {!deColonia && (
            <div className="card col" style={{ gap: 14 }}>
              <div className="col" style={{ gap: 2 }}>
                <h3 className="h3">Detalles del servicio</h3>
                <span className="muted" style={{ fontSize: 12 }}>Aparecen en la tarjeta de agua de la app. Ya vienen con lo publicado hoy.</span>
              </div>
              <div className="row" style={{ gap: 12 }}>
                <div className="field grow"><label className="section-label">HORARIO DE HOY</label>
                  <input className="input" value={detalle.horario} onChange={(e) => setDetalle({ ...detalle, horario: e.target.value })} placeholder="6:00 – 14:00 hrs" /></div>
                <div className="field" style={{ width: 140 }}><label className="section-label">PRESIÓN (BAR)</label>
                  <input className="input" type="number" min={0} step={0.1} value={detalle.presion ?? ""} onChange={(e) => setDetalle({ ...detalle, presion: e.target.value === "" ? null : Math.max(0, +e.target.value) })} /></div>
              </div>
              <div className="row" style={{ gap: 12 }}>
                <div className="field grow"><label className="section-label">CALIDAD</label>
                  <div className="seg">{["Potable", "En revisión", "No apta para beber"].map((c, i) => (
                    <button key={c} type="button" className={detalle.calidad === c ? `on ${["verde", "naranja", "rojo"][i]}` : ""} onClick={() => setDetalle({ ...detalle, calidad: c })}>{c}</button>
                  ))}</div></div>
                <div className="field grow"><label className="section-label">COBERTURA</label>
                  <div className="seg">{["Total", "Parcial", "Sin cobertura"].map((c, i) => (
                    <button key={c} type="button" className={detalle.cobertura === c ? `on ${["verde", "naranja", "rojo"][i]}` : ""} onClick={() => setDetalle({ ...detalle, cobertura: c })}>{c}</button>
                  ))}</div></div>
              </div>
            </div>
          )}

          <div className="card col" style={{ gap: 14 }}>
            <div className="banner info" style={{ gap: 10 }}>
              <span className="pill" style={{ background: "var(--brand)", color: "#fff" }}>PÚBLICO</span>
              <span className="grow" style={{ fontWeight: 500 }}>
                Esta publicación sale a la app. La verán {destino ? `los vecinos de ${destino}` : "todos los vecinos"}.
              </span>
            </div>

            <div className="row" style={{ alignItems: "center", gap: 14 }}>
              <div className="col grow" style={{ gap: 2 }}>
                <strong>Enviar notificación al teléfono</strong>
                <span className="muted" style={{ fontSize: 13 }}>
                  Le llega una alerta a {textoAlcance(destino)}. No se puede deshacer.
                </span>
              </div>
              <button type="button" className={`toggle${notificar ? " on" : ""}`}
                aria-pressed={notificar} aria-label="Enviar notificación" onClick={() => setNotificar((v) => !v)}>
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
                aria-pressed={programar} aria-label="Programar la publicación" onClick={() => setProgramar((v) => !v)}>
                <span className="knob" />
              </button>
            </div>

            {programar && (
              <input className="input" type="datetime-local" value={cuando} aria-label="Fecha y hora de publicación"
                onChange={(e) => setCuando(e.target.value)} />
            )}
          </div>

          <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button className="btn ghost" type="button" onClick={() => router.push("/panel")}>Cancelar</button>
            {notificar && (
              <button className="btn ghost" type="button" disabled={!listo} onClick={() => guardar(false)}>
                Guardar sin notificar
              </button>
            )}
            <button className="btn primary" type="button" disabled={!listo}
              onClick={() => (notificar ? setConfirmando(true) : guardar(false))}>
              {guardado ? "Publicado" : programar ? "Programar publicación" : notificar ? "Publicar y notificar" : "Publicar"}
            </button>
          </div>
        </div>

        <div className="col" style={{ width: 380, flex: "0 0 380px", gap: 12 }}>
          <span className="section-label">ASÍ SE VERÁ EN LA APP</span>

          <div className="card col" style={{ gap: 10, borderRadius: 20 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span className="section-label">AGUA · {(destino ?? "Todo el municipio").toUpperCase()}</span>
              {estado && <span className={`pill ${estado}`}>{ETIQUETA_ESTADO[estado].toUpperCase()}</span>}
            </div>
            <strong style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
              {estado ? titularApp : "Elige un estado"}
            </strong>
            <span className="muted" style={{ fontSize: 13 }}>
              {mensaje || "El mensaje aparecerá aquí."}
            </span>
            {!deColonia && (
              <div className="grid2" style={{ paddingTop: 4 }}>
                <div className="acard flat"><span className="s">Horario</span><span className="t" style={{ fontSize: 13 }}>{detalle.horario || "—"}</span></div>
                <div className="acard flat"><span className="s">Presión</span><span className="t" style={{ fontSize: 13 }}>{detalle.presion !== null ? `${detalle.presion} bar` : "—"}</span></div>
                <div className="acard flat"><span className="s">Calidad</span><span className="t" style={{ fontSize: 13 }}>{detalle.calidad}</span></div>
                <div className="acard flat"><span className="s">Cobertura</span><span className="t" style={{ fontSize: 13 }}>{detalle.cobertura}</span></div>
              </div>
            )}
            <span className="muted" style={{ fontSize: 11, fontWeight: 500 }}>
              {programadoPara
                ? `Se publicará el ${programadoPara.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                : "Actualizado hace unos segundos"}
            </span>
          </div>

          {notificar && estado && (
            <div className="card col" style={{ gap: 4 }}>
              <span className="section-label">NOTIFICACIÓN · AHORA</span>
              <strong>{tituloPush}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{mensaje || "—"}</span>
            </div>
          )}

          {estado && mensaje && (
            <CompartirRedes titulo={tituloPush} cuerpo={mensaje} colonia={destino ?? "Agua"} />
          )}
        </div>
      </div>

      {confirmando && (
        <ModalConfirmar
          colonia={destino ?? "Todo el municipio"} alcance={alcance} titulo={tituloPush}
          cuerpo={mensaje} programadoPara={programadoPara}
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => guardar(true)}
        />
      )}
    </>
  );
}
