"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import Mapa, { type Globo } from "@/components/Mapa";
import {
  ETIQUETA_ESTADO_REPORTE, ETIQUETA_REPORTE, cambiarEstadoReporte, haceTexto, listarReportes,
  type EstadoReporte, type Reporte,
} from "@/lib/datos";

const PILL: Record<EstadoReporte, string> = { recibido: "sin_servicio", en_proceso: "programado", resuelto: "activo" };
const COLOR_PIN: Record<EstadoReporte, string> = { recibido: "#d93a3a", en_proceso: "#c77700", resuelto: "#12a150" };
const ubicado = (r: Reporte) => r.lat !== null && r.lng !== null;
const FILTROS: (EstadoReporte | "pendientes" | "todos")[] = ["pendientes", "recibido", "en_proceso", "resuelto", "todos"];

export default function Reportes() {
  const { sesion } = useAuth();
  const [lista, setLista] = useState<Reporte[]>([]);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("pendientes");
  const [sel, setSel] = useState<Reporte | null>(null);
  const [estado, setEstado] = useState<EstadoReporte>("en_proceso");
  const [respuesta, setRespuesta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista] = useState<"lista" | "mapa">("lista");
  const [enfoque, setEnfoque] = useState<{ clave: string; puntos: { lng: number; lat: number }[] } | undefined>();

  const cargar = useCallback(async () => setLista(await listarReportes()), []);
  useEffect(() => { cargar(); }, [cargar]);

  function verEnMapa(r: Reporte) {
    if (!ubicado(r)) return;
    setVista("mapa");
    setEnfoque({ clave: `r-${r.id}-${Date.now()}`, puntos: [{ lng: r.lng!, lat: r.lat! }] });
  }

  function abrir(r: Reporte) {
    setSel(r);
    setEstado(r.estado === "recibido" ? "en_proceso" : r.estado);
    setRespuesta(r.respuesta ?? "");
  }

  const visibles = lista.filter((r) =>
    filtro === "todos" ? true : filtro === "pendientes" ? r.estado !== "resuelto" : r.estado === filtro);
  const cuenta = (f: (typeof FILTROS)[number]) =>
    lista.filter((r) => f === "todos" ? true : f === "pendientes" ? r.estado !== "resuelto" : r.estado === f).length;

  return (
    <div className="row">
      <div className="card grow col" style={{ gap: 0, paddingBottom: 8 }}>
        <div className="col" style={{ gap: 12, paddingBottom: 12 }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Reportes de los vecinos</h3>
            <span className="muted" style={{ fontSize: 13 }}>
              Llegan desde «Reportar falla» en la app, con foto, ubicación y folio. El vecino ve el estado que pongas aquí.
            </span>
          </div>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div className="chips">
            {FILTROS.map((f) => (
              <button key={f} type="button" className="chip"
                style={filtro === f ? { background: "var(--brand)", color: "#fff" } : undefined}
                onClick={() => setFiltro(f)}>
                {f === "pendientes" ? "Por atender" : f === "todos" ? "Todos" : ETIQUETA_ESTADO_REPORTE[f]} · {cuenta(f)}
              </button>
            ))}
          </div>
          <div className="seg" style={{ flexWrap: "nowrap" }}>
            <button type="button" className={vista === "lista" ? "on azul" : ""} onClick={() => setVista("lista")}>Lista</button>
            <button type="button" className={vista === "mapa" ? "on azul" : ""} onClick={() => { setVista("mapa"); setEnfoque({ clave: `todos-${Date.now()}`, puntos: visibles.filter(ubicado).map((r) => ({ lng: r.lng!, lat: r.lat! })) }); }}>Mapa</button>
          </div>
          </div>
        </div>
        {vista === "mapa" && (
          <MapaReportes reportes={visibles} sel={sel} enfoque={enfoque} onElegir={abrir} />
        )}
        {vista === "lista" && visibles.length === 0 && <span className="muted" style={{ padding: "8px 0 12px" }}>No hay reportes en esta vista.</span>}
        {vista === "lista" && visibles.map((r) => (
          <button key={r.id} type="button" className="list-row"
            style={{ border: "none", borderBottom: "1px solid var(--border)", background: sel?.id === r.id ? "var(--brand-soft)" : "none", textAlign: "left", width: "100%", padding: "11px 8px", borderRadius: 8 }}
            onClick={() => abrir(r)}>
            <strong style={{ width: 80, flex: "0 0 80px", fontSize: 12 }}>{r.folio}</strong>
            <span style={{ width: 100, flex: "0 0 100px", fontSize: 13, fontWeight: 500 }}>{ETIQUETA_REPORTE[r.tipo]}</span>
            <span className="muted grow" style={{ fontSize: 13 }}>{r.direccion} · {r.colonia}</span>
            <span className="muted" style={{ width: 80, flex: "0 0 80px", fontSize: 12 }}>{haceTexto(r.creadoEn)}</span>
            <span className={`pill ${PILL[r.estado]}`}>{ETIQUETA_ESTADO_REPORTE[r.estado].toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="card col" style={{ width: 380, flex: "0 0 380px", gap: 14 }}>
        {!sel ? (
          <span className="muted">Elige un reporte para atenderlo.</span>
        ) : (
          <>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span className="section-label">FOLIO {sel.folio}</span>
              <span className={`pill ${PILL[sel.estado]}`}>{ETIQUETA_ESTADO_REPORTE[sel.estado].toUpperCase()}</span>
            </div>
            <div className="col" style={{ gap: 4 }}>
              <strong style={{ fontSize: 18 }}>{ETIQUETA_REPORTE[sel.tipo]} · {sel.direccion}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{sel.colonia} · {sel.vecinoNombre} · {haceTexto(sel.creadoEn)}</span>
            </div>
            <p style={{ margin: 0 }}>{sel.descripcion}</p>
            {sel.fotoUrl
              ? <img src={sel.fotoUrl} alt="Foto del reporte" style={{ width: "100%", borderRadius: 10 }} />
              : <span className="muted" style={{ fontSize: 12 }}>Sin foto.</span>}
            <div className="acard flat" style={{ gap: 4 }}>
              <span className="section-label">QUIÉN LO REPORTÓ</span>
              <span className="t" style={{ fontSize: 13 }}>{sel.vecinoNombre}</span>
              <span className="s">{sel.telefono ?? "Sin teléfono"} · vecino de {sel.colonia}</span>
            </div>
            {ubicado(sel) ? (
              <div className="col" style={{ gap: 6 }}>
                <span className="section-label">DÓNDE SUCEDIÓ</span>
                <Mapa alto={180} zoom={16} marcadores={[{ id: "r", punto: { lng: sel.lng!, lat: sel.lat! }, color: COLOR_PIN[sel.estado] }]}
                  ajustar={{ clave: `d-${sel.id}`, puntos: [{ lng: sel.lng!, lat: sel.lat! }] }} />
                <span className="muted" style={{ fontSize: 11 }}>{sel.lat!.toFixed(5)}, {sel.lng!.toFixed(5)} · GPS del teléfono del vecino</span>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn ghost" style={{ padding: "7px 12px" }} type="button" onClick={() => verEnMapa(sel)}>Ver en el mapa grande</button>
                  <a className="btn ghost" style={{ padding: "7px 12px" }} href={`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}`} target="_blank" rel="noreferrer">Cómo llegar</a>
                </div>
              </div>
            ) : <span className="muted" style={{ fontSize: 12 }}>El vecino no compartió su ubicación; solo dejó la dirección.</span>}

            <div className="field" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <label className="section-label">NUEVO ESTADO</label>
              <div className="options">
                {(["recibido", "en_proceso", "resuelto"] as EstadoReporte[]).map((e) => (
                  <button key={e} type="button"
                    className={`option${estado === e ? ` on ${PILL[e] === "programado" ? "sin_dato" : PILL[e]}` : ""}`}
                    style={{ padding: "10px" }}
                    onClick={() => setEstado(e)}>
                    <span className="radio" />{ETIQUETA_ESTADO_REPORTE[e]}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="section-label">RESPUESTA PARA EL VECINO</label>
              <textarea className="textarea" value={respuesta} onChange={(e) => setRespuesta(e.target.value)}
                placeholder="La cuadrilla va en camino. Calculamos tenerlo listo mañana." />
            </div>
            <button className="btn primary" type="button"
              disabled={guardando || (estado === sel.estado && respuesta === (sel.respuesta ?? ""))}
              onClick={async () => {
                setGuardando(true);
                await cambiarEstadoReporte(sel, estado, respuesta.trim(), sesion!.nombre);
                await cargar();
                setSel({ ...sel, estado, respuesta: respuesta.trim() || null });
                setGuardando(false);
              }}>
              {guardando ? "Guardando…" : "Guardar y avisar al vecino"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MapaReportes({ reportes, sel, enfoque, onElegir }: {
  reportes: Reporte[]; sel: Reporte | null; enfoque?: { clave: string; puntos: { lng: number; lat: number }[] }; onElegir: (r: Reporte) => void;
}) {
  const conUbicacion = reportes.filter(ubicado);
  const marcadores = useMemo(() => conUbicacion.map((r) => ({
    id: r.id!, punto: { lng: r.lng!, lat: r.lat! }, color: COLOR_PIN[r.estado],
    texto: r.id === sel?.id ? "●" : "", onClick: () => onElegir(r),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [reportes, sel?.id]);
  const globo = useMemo<Globo | null>(() => sel && ubicado(sel)
    ? { punto: { lng: sel.lng!, lat: sel.lat! }, titulo: `${sel.folio} · ${ETIQUETA_REPORTE[sel.tipo]}`, lineas: [`${sel.direccion}, ${sel.colonia}`, `Reportó: ${sel.vecinoNombre}`, haceTexto(sel.creadoEn)] }
    : null, [sel]);
  return (
    <div className="col" style={{ gap: 8, paddingBottom: 8 }}>
      <Mapa alto={480} marcadores={marcadores} globo={globo} ajustar={enfoque} />
      <div className="row" style={{ gap: 14, fontSize: 12 }}>
        {(["recibido", "en_proceso", "resuelto"] as EstadoReporte[]).map((e) => (
          <span key={e} className="row" style={{ gap: 6, alignItems: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: COLOR_PIN[e] }} />{ETIQUETA_ESTADO_REPORTE[e]}</span>
        ))}
        {reportes.length > conUbicacion.length && <span className="muted">{reportes.length - conUbicacion.length} sin ubicación</span>}
      </div>
    </div>
  );
}
