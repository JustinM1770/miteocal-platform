"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { auth, firebaseListo } from "@/lib/firebase";
import Mapa, { type Globo } from "@/components/Mapa";
import { f } from "@/lib/almacen";
import {
  AREAS_RESPONSABLES, ETIQUETA_ESTADO_REPORTE, ETIQUETA_REPORTE, TIPOS_REPORTE,
  cambiarEstadoReporte, detectarReportesDuplicados, guardarClasificacionFinalReporte, haceTexto, listarReportes,
  type AreaResponsableReporte, type ClasificacionIASugerida, type EstadoReporte, type Reporte, type TipoReporte, type UrgenciaReporte,
} from "@/lib/datos";

const PILL: Record<EstadoReporte, string> = { recibido: "sin_servicio", en_proceso: "programado", resuelto: "activo" };
const COLOR_PIN: Record<EstadoReporte, string> = { recibido: "#d93a3a", en_proceso: "#c77700", resuelto: "#12a150" };
const ubicado = (r: Reporte) => r.lat !== null && r.lng !== null;
const FILTROS: (EstadoReporte | "pendientes" | "todos")[] = ["pendientes", "recibido", "en_proceso", "resuelto", "todos"];

export default function Reportes() {
  const { sesion } = useAuth();
  const intentosClasificacion = useRef(new Set<string>());
  const seleccionActual = useRef<string | null>(null);
  const [lista, setLista] = useState<Reporte[]>([]);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>("pendientes");
  const [sel, setSel] = useState<Reporte | null>(null);
  const [estado, setEstado] = useState<EstadoReporte>("en_proceso");
  const [respuesta, setRespuesta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardandoClasificacion, setGuardandoClasificacion] = useState(false);
  const [tipoFinal, setTipoFinal] = useState<TipoReporte>("otro");
  const [urgenciaFinal, setUrgenciaFinal] = useState<UrgenciaReporte>("media");
  const [areaFinal, setAreaFinal] = useState<AreaResponsableReporte>("Por determinar");
  const [estadoIA, setEstadoIA] = useState<{ id: string; estado: "analizando" | "error"; mensaje?: string } | null>(null);
  const [errorGuardarClasificacion, setErrorGuardarClasificacion] = useState("");
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
    seleccionActual.current = r.id ?? null;
    setSel(r);
    setEstado(r.estado === "recibido" ? "en_proceso" : r.estado);
    setRespuesta(r.respuesta ?? "");
    const clasificacion = r.clasificacionFinal ?? r.clasificacionIASugerida;
    setTipoFinal(clasificacion?.tipo ?? r.tipo);
    setUrgenciaFinal(clasificacion?.urgencia ?? "media");
    setAreaFinal(clasificacion?.area ?? "Por determinar");
    setErrorGuardarClasificacion("");
  }

  useEffect(() => {
    const usuario = auth?.currentUser;
    if (!sel?.id || sel.clasificacionIASugerida || !firebaseListo || !usuario) return;
    const reporteId = sel.id;
    if (intentosClasificacion.current.has(reporteId)) return;
    intentosClasificacion.current.add(reporteId);
    setEstadoIA({ id: reporteId, estado: "analizando" });

    void (async () => {
      try {
        const token = await usuario.getIdToken();
        const response = await fetch("/api/reportes/clasificar", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ reporteId }),
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          const mensaje = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
            ? body.error
            : "No se pudo clasificar el reporte.";
          throw new Error(mensaje);
        }
        if (typeof body !== "object" || body === null || !("clasificacion" in body) || typeof body.clasificacion !== "object" || body.clasificacion === null) {
          throw new Error("La respuesta de clasificación no tiene el formato esperado.");
        }
        const valor = body.clasificacion;
        if (
          !("tipo" in valor) || typeof valor.tipo !== "string" || !TIPOS_REPORTE.includes(valor.tipo as TipoReporte)
          || !("urgencia" in valor) || !["baja", "media", "alta"].includes(String(valor.urgencia))
          || !("area" in valor) || typeof valor.area !== "string" || !AREAS_RESPONSABLES.includes(valor.area as AreaResponsableReporte)
          || !("confianza" in valor) || typeof valor.confianza !== "number"
          || !("modelo" in valor) || typeof valor.modelo !== "string"
          || !("clasificadaEn" in valor) || typeof valor.clasificadaEn !== "string"
        ) {
          throw new Error("La respuesta de clasificación contiene datos inválidos.");
        }
        const sugerencia = {
          tipo: valor.tipo as TipoReporte,
          urgencia: valor.urgencia as UrgenciaReporte,
          area: valor.area as AreaResponsableReporte,
          confianza: valor.confianza,
          modelo: valor.modelo,
          clasificadaEn: new Date(valor.clasificadaEn),
        };
        if (Number.isNaN(sugerencia.clasificadaEn.getTime())) {
          throw new Error("La respuesta de clasificación contiene una fecha inválida.");
        }

        const actualizada = { ...sel, clasificacionIASugerida: sugerencia };
        setLista((actual) => actual.map((r) => r.id === reporteId ? { ...r, clasificacionIASugerida: sugerencia } : r));
        if (seleccionActual.current === reporteId) {
          setSel(actualizada);
          setTipoFinal(actualizada.clasificacionFinal?.tipo ?? sugerencia.tipo);
          setUrgenciaFinal(actualizada.clasificacionFinal?.urgencia ?? sugerencia.urgencia);
          setAreaFinal(actualizada.clasificacionFinal?.area ?? sugerencia.area);
        }
        if (seleccionActual.current === reporteId) setEstadoIA(null);
      } catch (error) {
        if (seleccionActual.current === reporteId) {
          setEstadoIA({
            id: reporteId,
            estado: "error",
            mensaje: error instanceof Error ? error.message : "No se pudo clasificar el reporte.",
          });
        }
      }
    })();
  }, [sel]);

  async function guardarClasificacion(
    origen: "ia" | "funcionario",
    valores?: Pick<ClasificacionIASugerida, "tipo" | "urgencia" | "area">,
  ) {
    if (!sel || !sesion) return;
    const reporteSeleccionado = sel;
    setGuardandoClasificacion(true);
    setErrorGuardarClasificacion("");
    try {
      const final = await guardarClasificacionFinalReporte(
        reporteSeleccionado,
        { tipo: valores?.tipo ?? tipoFinal, urgencia: valores?.urgencia ?? urgenciaFinal, area: valores?.area ?? areaFinal, origen },
        sesion.nombre,
        sesion.uid,
      );
      const actualizada = { ...reporteSeleccionado, tipo: final.tipo, clasificacionFinal: final };
      setLista((actual) => actual.map((r) => r.id === reporteSeleccionado.id ? actualizada : r));
      if (seleccionActual.current === reporteSeleccionado.id) {
        setSel(actualizada);
        setTipoFinal(final.tipo);
        setUrgenciaFinal(final.urgencia);
        setAreaFinal(final.area);
      }
    } catch (error) {
      setErrorGuardarClasificacion(error instanceof Error ? error.message : "No se pudo guardar la clasificación.");
    } finally {
      setGuardandoClasificacion(false);
    }
  }

  const duplicados = sel ? detectarReportesDuplicados(sel, lista) : [];
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
            <div className="acard flat col" style={{ gap: 10 }}>
              <span className="section-label">CLASIFICACIÓN DEL REPORTE</span>
              {sel.clasificacionIASugerida ? (
                <div className="col" style={{ gap: 3 }}>
                  <strong>
                    Sugerido: {ETIQUETA_REPORTE[sel.clasificacionIASugerida.tipo]} · urgencia {sel.clasificacionIASugerida.urgencia}
                  </strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {sel.clasificacionIASugerida.area} · confianza estimada {sel.clasificacionIASugerida.confianza}% · {sel.clasificacionIASugerida.modelo}
                  </span>
                  {sel.clasificacionFinal && (
                    <span className="muted" style={{ fontSize: 12 }}>
                      Clasificación guardada: {ETIQUETA_REPORTE[sel.clasificacionFinal.tipo]} · urgencia {sel.clasificacionFinal.urgencia} · {sel.clasificacionFinal.area}
                    </span>
                  )}
                  <button className="btn ghost" type="button" disabled={guardandoClasificacion}
                    onClick={() => void guardarClasificacion("ia", sel.clasificacionIASugerida)}>
                    Aceptar sugerencia
                  </button>
                </div>
              ) : estadoIA && estadoIA.id === sel.id && estadoIA.estado === "analizando" ? (
                <span className="muted" style={{ fontSize: 13 }}>Analizando el texto y la foto con Claude Haiku…</span>
              ) : estadoIA && estadoIA.id === sel.id && estadoIA.estado === "error" ? (
                <div className="col" style={{ gap: 6 }}>
                  <span role="alert" style={{ fontSize: 13 }}>{estadoIA?.mensaje ?? "Falló el análisis con IA."} La clasificación manual sigue disponible.</span>
                  <button className="btn ghost" type="button" onClick={() => {
                    intentosClasificacion.current.delete(sel.id!);
                    setSel({ ...sel });
                  }}>Reintentar análisis</button>
                </div>
              ) : !firebaseListo ? (
                <span className="muted" style={{ fontSize: 13 }}>
                  La IA requiere Firebase y la llave de Anthropic configurada como secreto del servidor. Puedes clasificar manualmente.
                </span>
              ) : null}
              {sel.clasificacionFinal && !sel.clasificacionIASugerida && (
                <span className="muted" style={{ fontSize: 12 }}>
                  Clasificación guardada: {ETIQUETA_REPORTE[sel.clasificacionFinal.tipo]} · urgencia {sel.clasificacionFinal.urgencia} · {sel.clasificacionFinal.area}
                </span>
              )}
              <div className="field">
                <label className="section-label" htmlFor="tipo-clasificacion">TIPO</label>
                <select id="tipo-clasificacion" className="select" value={tipoFinal} onChange={(e) => setTipoFinal(e.target.value as TipoReporte)}>
                  {TIPOS_REPORTE.map((tipo) => <option key={tipo} value={tipo}>{ETIQUETA_REPORTE[tipo]}</option>)}
                </select>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <div className="field grow">
                  <label className="section-label" htmlFor="urgencia-clasificacion">URGENCIA</label>
                  <select id="urgencia-clasificacion" className="select" value={urgenciaFinal} onChange={(e) => setUrgenciaFinal(e.target.value as UrgenciaReporte)}>
                    {(["baja", "media", "alta"] as UrgenciaReporte[]).map((urgencia) => <option key={urgencia} value={urgencia}>{urgencia}</option>)}
                  </select>
                </div>
                <div className="field grow">
                  <label className="section-label" htmlFor="area-clasificacion">ÁREA</label>
                  <select id="area-clasificacion" className="select" value={areaFinal} onChange={(e) => setAreaFinal(e.target.value as AreaResponsableReporte)}>
                    {AREAS_RESPONSABLES.map((area) => <option key={area} value={area}>{area}</option>)}
                  </select>
                </div>
              </div>
              {errorGuardarClasificacion && <span role="alert" style={{ fontSize: 13 }}>{errorGuardarClasificacion}</span>}
              <button className="btn primary" type="button" disabled={guardandoClasificacion}
                onClick={() => void guardarClasificacion("funcionario")}>
                {guardandoClasificacion ? "Guardando…" : sel.clasificacionIASugerida ? "Guardar corrección" : "Guardar clasificación manual"}
              </button>
            </div>
            <div className="acard flat col" style={{ gap: 6 }}>
              <span className="section-label">POSIBLES REPORTES DUPLICADOS</span>
              <span className="muted" style={{ fontSize: 12 }}>
                Mismo tipo, a menos de 50 m y con menos de 7 días de diferencia. Son sugerencias para revisión; no se combinan ni cierran automáticamente.
              </span>
              {sel.lat === null || sel.lng === null ? (
                <span className="muted" style={{ fontSize: 12 }}>No se puede buscar coincidencias porque este reporte no tiene ubicación GPS.</span>
              ) : duplicados.length === 0 ? (
                <span className="muted" style={{ fontSize: 12 }}>No se encontraron coincidencias con los criterios configurados.</span>
              ) : duplicados.map(({ reporte, distanciaMetros }) => (
                <button key={reporte.id} type="button" className="list-row"
                style={{ border: "none", background: "var(--subtle)", textAlign: "left", width: "100%", padding: 8, borderRadius: 8 }}
                  onClick={() => abrir(reporte)}>
                  <strong>{reporte.folio} · {ETIQUETA_REPORTE[reporte.tipo]}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>{distanciaMetros} m · {reporte.colonia} · {haceTexto(reporte.creadoEn)}</span>
                </button>
              ))}
            </div>
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

            {sel.historial.length > 0 && (
              <div className="col" style={{ gap: 6 }}>
                <span className="section-label">HISTORIAL</span>
                <div className="timeline">
                  {sel.historial.map((h, i) => (
                    <div key={i} className="tl-row">
                      <span className="hora">{f(h.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>
                      <span className="rail"><i /></span>
                      <div className="body col" style={{ gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{ETIQUETA_ESTADO_REPORTE[h.estado]}</span>
                        {h.mensaje && <span style={{ fontSize: 12 }}>{h.mensaje}</span>}
                        <span className="muted" style={{ fontSize: 11 }}>{h.autor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                await cambiarEstadoReporte(sel, estado, respuesta.trim(), sesion!.nombre, sesion!.uid);
                await cargar();
                setSel({ ...sel, estado, respuesta: respuesta.trim() || null, historial: [...sel.historial, { estado, mensaje: respuesta.trim(), autor: sesion!.nombre, fecha: new Date() }] });
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
