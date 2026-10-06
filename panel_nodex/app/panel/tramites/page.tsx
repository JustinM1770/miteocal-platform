"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Kpi } from "@/components/graficas";
import { haceTexto } from "@/lib/datos";
import { f, pesos } from "@/lib/almacen";
import {
  DEPENDENCIAS, ENTREGAS, ESTADOS, actualizarSolicitud, listarSolicitudes, listarTramites, solicitudEnVentanilla,
  type Dependencia, type EstadoSolicitud, type Solicitud, type Tramite,
} from "@/lib/tramites";

type Filtro = "activas" | EstadoSolicitud | "todas";

export default function Solicitudes() {
  const { sesion } = useAuth();
  const [lista, setLista] = useState<Solicitud[]>([]);
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("activas");
  const [dep, setDep] = useState<Dependencia | "">("");
  const [sel, setSel] = useState<Solicitud | null>(null);
  const [ventanilla, setVentanilla] = useState(false);

  // Cada área ve solo lo suyo; el administrador ve todo
  const miArea = sesion?.rol !== "admin" && (DEPENDENCIAS as readonly string[]).includes(sesion?.area ?? "") ? (sesion!.area as Dependencia) : null;

  const cargar = useCallback(async () => {
    const [s, t] = await Promise.all([listarSolicitudes(), listarTramites()]);
    setLista([...s]); setTramites(t);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const delArea = lista.filter((s) => (miArea ? s.dependencia === miArea : !dep || s.dependencia === dep));
  const activas = (s: Solicitud) => s.estado !== "entregada" && s.estado !== "rechazada";
  const visibles = delArea.filter((s) => filtro === "todas" ? true : filtro === "activas" ? activas(s) : s.estado === filtro);
  const cuenta = (x: Filtro) => delArea.filter((s) => x === "todas" ? true : x === "activas" ? activas(s) : s.estado === x).length;
  const hoy = new Date().toLocaleDateString("en-CA");
  const citasHoy = delArea.filter((s) => s.cita && f(s.cita).toLocaleDateString("en-CA") === hoy).length;

  return (
    <>
      <div className="row">
        <Kpi n={cuenta("recibida")} t="Nuevas por revisar" s="Llegaron desde la app o ventanilla" onClick={() => setFiltro("recibida")} />
        <Kpi n={cuenta("falta_documento")} t="Esperando al vecino" s="Les pedimos corregir un documento" onClick={() => setFiltro("falta_documento")} />
        <Kpi n={cuenta("lista")} t="Listas para recoger" s="Ya se le avisó al vecino" onClick={() => setFiltro("lista")} />
        <Kpi n={citasHoy} t="Citas hoy" s={miArea ?? "Todas las dependencias"} />
      </div>

      <div className="card col" style={{ gap: 0, paddingBottom: 8 }}>
        <div className="row" style={{ gap: 10, paddingBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="seg grow">
            {(["activas", "recibida", "en_revision", "falta_documento", "lista", "todas"] as Filtro[]).map((x) => (
              <button key={x} type="button" className={filtro === x ? "on azul" : ""} onClick={() => setFiltro(x)}>
                {x === "activas" ? "En curso" : x === "todas" ? "Todas" : ESTADOS[x].nombre} · {cuenta(x)}
              </button>
            ))}
          </div>
          {miArea
            ? <span className="pill publico">Solo {miArea}</span>
            : (
              <select className="select" style={{ width: 200 }} value={dep} onChange={(e) => setDep(e.target.value as Dependencia | "")}>
                <option value="">Todas las dependencias</option>
                {DEPENDENCIAS.map((d) => <option key={d}>{d}</option>)}
              </select>
            )}
          <button className="btn primary" type="button" onClick={() => setVentanilla(true)}>Registrar en ventanilla</button>
        </div>
        <table className="tabla">
          <thead><tr><th>FOLIO</th><th>TRÁMITE</th><th>VECINO</th><th>CITA</th><th>PAGO</th><th>ESTADO</th></tr></thead>
          <tbody>
            {visibles.length === 0 && <tr><td colSpan={6} className="muted">No hay solicitudes en esta vista.</td></tr>}
            {visibles.map((s) => (
              <tr key={s.id} className={`click${sel?.id === s.id ? " sel" : ""}`} onClick={() => setSel(s)}>
                <td><strong>{s.folio}</strong><div className="muted" style={{ fontSize: 11 }}>{haceTexto(s.creadoEn)} · {s.canal === "app" ? "app" : "ventanilla"}</div></td>
                <td>{s.tramite}<div className="muted" style={{ fontSize: 11 }}>{s.dependencia}</div></td>
                <td>{s.vecinoNombre}{s.entrega !== "oficina" && <div className="muted" style={{ fontSize: 11 }}>✈ {ENTREGAS[s.entrega]}</div>}</td>
                <td className="muted" style={{ whiteSpace: "nowrap" }}>{s.cita ? f(s.cita).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                <td>{s.pago ? <span className={`tag ${s.pago.estado === "pagado" ? "verde" : "naranja"}`}>{pesos(s.pago.monto)}{s.pago.estado === "pendiente" ? " · pendiente" : ""}</span> : <span className="muted">Gratis</span>}</td>
                <td><span className={`tag ${ESTADOS[s.estado].color}`}>{ESTADOS[s.estado].nombre}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && <Detalle sol={sel} onCerrar={() => setSel(null)} onCambio={async (nueva) => { setSel(nueva); await cargar(); }} />}
      {ventanilla && (
        <Ventanilla tramites={tramites.filter((t) => t.activo && (!miArea || t.dependencia === miArea))}
          onCerrar={() => setVentanilla(false)} onListo={async () => { setVentanilla(false); await cargar(); }} />
      )}
    </>
  );
}

function Detalle({ sol, onCerrar, onCambio }: { sol: Solicitud; onCerrar: () => void; onCambio: (s: Solicitud) => Promise<void> }) {
  const { sesion } = useAuth();
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const rechazados = sol.documentos.filter((d) => d.estado === "rechazado").length;
  const pendientes = sol.documentos.filter((d) => d.estado === "pendiente").length;

  async function aplicar(cambios: Partial<Solicitud>, accion: string, nota?: string) {
    setGuardando(true);
    const notas = nota ? [...sol.notas, { texto: nota, autor: sesion!.nombre, fecha: new Date(), publica: true }] : sol.notas;
    await actualizarSolicitud(sol, { ...cambios, notas }, accion, sesion!.nombre);
    setMensaje("");
    setGuardando(false);
    await onCambio({ ...sol, ...cambios, notas });
  }

  function documento(i: number, estado: "aceptado" | "rechazado") {
    const documentos = sol.documentos.map((d, k) => (k === i ? { ...d, estado, motivo: estado === "rechazado" ? mensaje || "No se puede leer" : undefined } : d));
    return aplicar({ documentos }, estado === "aceptado" ? "Aceptó documento" : "Rechazó documento");
  }

  return (
    <div className="drawer">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <span className="section-label">FOLIO {sol.folio}</span>
        <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" onClick={onCerrar}>Cerrar</button>
      </div>
      <div className="col" style={{ gap: 4 }}>
        <strong style={{ fontSize: 18 }}>{sol.tramite}</strong>
        <span className="muted" style={{ fontSize: 13 }}>{sol.dependencia} · {sol.vecinoNombre} · {sol.telefono}</span>
        <span className={`tag ${ESTADOS[sol.estado].color}`}>{ESTADOS[sol.estado].nombre}</span>
      </div>

      <div className="grid2">
        <div className="acard flat"><span className="s">Cita</span><span className="t" style={{ fontSize: 13 }}>{sol.cita ? f(sol.cita).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Sin cita"}</span></div>
        <div className="acard flat"><span className="s">Pago</span><span className="t" style={{ fontSize: 13 }}>{sol.pago ? `${pesos(sol.pago.monto)} · ${sol.pago.estado === "pagado" ? sol.pago.metodo : "pendiente"}` : "Gratuito"}</span></div>
        <div className="acard flat" style={{ gridColumn: "1 / -1" }}><span className="s">Entrega</span><span className="t" style={{ fontSize: 13 }}>{ENTREGAS[sol.entrega]}</span></div>
      </div>

      <div className="col" style={{ gap: 8 }}>
        <span className="section-label">DOCUMENTOS · {sol.documentos.length - pendientes - rechazados} DE {sol.documentos.length} ACEPTADOS</span>
        {sol.documentos.map((d, i) => (
          <div key={d.nombre} className="acard" style={{ gap: 6 }}>
            <div className="row" style={{ justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <span className="t" style={{ fontSize: 13 }}>{d.nombre}</span>
              <span className={`tag ${d.estado === "aceptado" ? "verde" : d.estado === "rechazado" ? "rojo" : "gris"}`}>{d.estado === "aceptado" ? "Aceptado" : d.estado === "rechazado" ? "Rechazado" : "Por revisar"}</span>
            </div>
            {d.url ? <a href={d.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600 }}>Ver archivo</a> : <span className="s">{sol.canal === "ventanilla" ? "Se revisa en físico" : "Archivo de la app (se verá cuando Storage esté activo)"}</span>}
            {d.motivo && <span className="s" style={{ color: "var(--danger)" }}>{d.motivo}</span>}
            {sol.estado !== "entregada" && sol.estado !== "rechazada" && (
              <div className="row" style={{ gap: 6 }}>
                <button className="btn ghost" style={{ padding: "5px 10px" }} type="button" disabled={guardando || d.estado === "aceptado"} onClick={() => documento(i, "aceptado")}>Aceptar</button>
                <button className="btn ghost" style={{ padding: "5px 10px", color: "var(--danger)" }} type="button" disabled={guardando || d.estado === "rechazado"} onClick={() => documento(i, "rechazado")}>Rechazar</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {sol.estado !== "entregada" && sol.estado !== "rechazada" && (
        <div className="col" style={{ gap: 8 }}>
          <span className="section-label">MENSAJE PARA EL VECINO</span>
          <textarea className="textarea" value={mensaje} onChange={(e) => setMensaje(e.target.value)}
            placeholder={rechazados ? "Explica qué debe corregir. También se usa como motivo al rechazar un documento." : "Opcional. Le llega como notificación."} />
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {sol.estado === "recibida" && <button className="btn ghost" type="button" disabled={guardando} onClick={() => aplicar({ estado: "en_revision" }, "Empezó a revisar solicitud", mensaje || undefined)}>Empezar revisión</button>}
            {rechazados > 0 && <button className="btn warn" type="button" disabled={guardando} onClick={() => aplicar({ estado: "falta_documento" }, "Pidió corregir documento", mensaje || ESTADOS.falta_documento.aviso)}>Pedir corrección</button>}
            {sol.estado !== "lista" && <button className="btn primary" type="button" disabled={guardando || rechazados + pendientes > 0 || sol.pago?.estado === "pendiente"}
              title={rechazados + pendientes > 0 ? "Acepta todos los documentos primero" : sol.pago?.estado === "pendiente" ? "Falta el pago" : undefined}
              onClick={() => aplicar({ estado: "lista" }, "Marcó trámite listo para recoger", mensaje || ESTADOS.lista.aviso)}>Lista para recoger</button>}
            {sol.estado === "lista" && <button className="btn primary" type="button" disabled={guardando} onClick={() => aplicar({ estado: "entregada" }, "Entregó trámite")}>Marcar entregada</button>}
            <button className="btn ghost" style={{ color: "var(--danger)" }} type="button" disabled={guardando || !mensaje.trim()}
              title={!mensaje.trim() ? "Escribe el motivo en el mensaje" : undefined}
              onClick={() => aplicar({ estado: "rechazada" }, "Rechazó solicitud", mensaje)}>No procede</button>
          </div>
          {sol.pago?.estado === "pendiente" && (
            <button className="btn ghost" style={{ alignSelf: "flex-start" }} type="button" disabled={guardando}
              onClick={() => aplicar({ pago: { ...sol.pago!, estado: "pagado", metodo: "Ventanilla" } }, "Registró pago en ventanilla")}>Registrar pago en ventanilla</button>
          )}
        </div>
      )}

      <div className="col" style={{ gap: 6 }}>
        <span className="section-label">HISTORIAL</span>
        <div className="timeline">
          <div className="tl-row"><span className="hora">{f(sol.creadoEn).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span><span className="rail"><i /></span>
            <div className="body"><span style={{ fontSize: 13, fontWeight: 600 }}>Solicitud {sol.canal === "app" ? "desde la app" : "en ventanilla"}</span></div></div>
          {sol.notas.map((n, i) => (
            <div key={i} className="tl-row"><span className="hora">{f(n.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span><span className="rail"><i /></span>
              <div className="body col" style={{ gap: 2 }}><span style={{ fontSize: 13 }}>{n.texto}</span><span className="muted" style={{ fontSize: 11 }}>{n.autor}{n.publica ? " · lo vio el vecino" : ""}</span></div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ventanilla({ tramites, onCerrar, onListo }: { tramites: Tramite[]; onCerrar: () => void; onListo: () => Promise<void> }) {
  const { sesion } = useAuth();
  const [tramiteId, setTramiteId] = useState(tramites[0]?.id ?? "");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cita, setCita] = useState("");
  const [folio, setFolio] = useState<string | null>(null);
  const tr = tramites.find((t) => t.id === tramiteId);

  return (
    <div className="scrim" onClick={onCerrar}>
      <div className="modal col" style={{ width: 540, gap: 14 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Registrar solicitud en ventanilla</h3>
        <span className="muted" style={{ fontSize: 13 }}>Para quien llega sin la app. Queda con folio y seguimiento igual que las de la app.</span>
        {tramites.length === 0 ? <span className="muted">No hay trámites en el catálogo. Agrégalos en la pestaña Catálogo.</span> : (
          <>
            <div className="field"><label className="section-label">TRÁMITE</label>
              <select className="select" value={tramiteId} onChange={(e) => setTramiteId(e.target.value)}>
                {tramites.map((t) => <option key={t.id} value={t.id}>{t.dependencia} · {t.nombre}</option>)}
              </select></div>
            {tr && <span className="muted" style={{ fontSize: 12 }}>Requisitos: {tr.requisitos.join(" · ")}</span>}
            <div className="row" style={{ gap: 10 }}>
              <div className="field grow"><label className="section-label">NOMBRE</label><input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
              <div className="field" style={{ width: 170 }}><label className="section-label">TELÉFONO</label><input className="input" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></div>
            </div>
            {tr?.modalidad === "cita" && (
              <div className="field"><label className="section-label">CITA</label><input className="input" type="datetime-local" value={cita} onChange={(e) => setCita(e.target.value)} /></div>
            )}
            {folio && <div className="banner" style={{ background: "var(--ok-soft)" }}><strong>Registrada · folio {folio}</strong><span className="muted">Dáselo al vecino para su seguimiento.</span></div>}
            <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
              <button className="btn ghost" type="button" onClick={folio ? onListo : onCerrar}>{folio ? "Listo" : "Cancelar"}</button>
              {!folio && <button className="btn primary" type="button" disabled={!tr || !nombre.trim()}
                onClick={async () => setFolio(await solicitudEnVentanilla(tr!, nombre.trim(), telefono.trim(), cita ? new Date(cita) : null, sesion!.nombre))}>Registrar</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
