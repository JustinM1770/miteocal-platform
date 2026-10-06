"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { pesos } from "@/lib/almacen";
import {
  CATALOGO_SUGERIDO, DEPENDENCIAS, MODALIDADES, guardarTramite, listarTramites, usarCatalogoSugerido,
  type Dependencia, type Modalidad, type Tramite,
} from "@/lib/tramites";

const VACIO: Tramite = { dependencia: "Registro Civil", nombre: "", descripcion: "", requisitos: [""], costo: 0, pagoEnLinea: false, modalidad: "mixta", dias: 1, paraPaisanos: false, activo: true };

export default function Catalogo() {
  const { sesion } = useAuth();
  const [lista, setLista] = useState<Tramite[]>([]);
  const [editando, setEditando] = useState<Tramite | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => setLista([...(await listarTramites())]), []);
  useEffect(() => { cargar(); }, [cargar]);

  const faltan = CATALOGO_SUGERIDO.filter((s) => !lista.some((t) => t.nombre === s.nombre)).length;

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <span className="muted" style={{ fontSize: 13 }}>Lo que el vecino ve en «Trámites y pagos» de la app: requisitos, costo y si necesita ir.</span>
        <div className="row" style={{ gap: 8, flex: "0 0 auto" }}>
          {faltan > 0 && (
            <button className="btn ghost" type="button" onClick={async () => {
              const n = await usarCatalogoSugerido(lista, sesion!.nombre);
              setAviso(`Se agregaron ${n} trámites sugeridos. Revisa costos y requisitos de tu municipio.`); await cargar();
            }}>Agregar {faltan} trámites sugeridos</button>
          )}
          <button className="btn primary" type="button" onClick={() => setEditando({ ...VACIO, requisitos: [""] })}>Nuevo trámite</button>
        </div>
      </div>
      {aviso && <div className="banner info"><strong>{aviso}</strong></div>}
      {lista.length === 0 && <div className="card muted">Todavía no hay trámites. Empieza con los sugeridos y ajústalos.</div>}

      {DEPENDENCIAS.filter((d) => lista.some((t) => t.dependencia === d)).map((d) => (
        <div key={d} className="col" style={{ gap: 10 }}>
          <span className="section-label">{d.toUpperCase()}</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {lista.filter((t) => t.dependencia === d).map((t) => (
              <button key={t.id} type="button" className="card col" style={{ gap: 6, textAlign: "left", opacity: t.activo ? 1 : 0.55, cursor: "pointer" }} onClick={() => setEditando({ ...t })}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <strong>{t.nombre}</strong>
                  <span className="precio" style={{ fontSize: 14, whiteSpace: "nowrap" }}>{t.costo ? pesos(t.costo) : "Gratis"}</span>
                </div>
                <span className="muted" style={{ fontSize: 12 }}>{t.descripcion}</span>
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <span className={`tag ${t.modalidad === "en_linea" ? "verde" : t.modalidad === "cita" ? "naranja" : "azul"}`}>{MODALIDADES[t.modalidad].nombre}</span>
                  <span className="tag gris">{t.requisitos.length} requisitos · {t.dias} día{t.dias === 1 ? "" : "s"}</span>
                  {t.paraPaisanos && <span className="tag azul">✈ Paisanos</span>}
                  {!t.activo && <span className="tag gris">Oculto</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {editando && (
        <Editor tramite={editando} onCerrar={() => setEditando(null)}
          onGuardar={async (t) => { await guardarTramite(t, sesion!.nombre); setEditando(null); await cargar(); }} />
      )}
    </>
  );
}

function Editor({ tramite, onCerrar, onGuardar }: { tramite: Tramite; onCerrar: () => void; onGuardar: (t: Tramite) => Promise<void> }) {
  const [t, setT] = useState<Tramite>(tramite);
  const poner = (c: Partial<Tramite>) => setT((x) => ({ ...x, ...c }));
  const reqs = t.requisitos.filter((r) => r.trim());
  const listo = t.nombre.trim() && reqs.length > 0 && t.dias > 0 && t.costo >= 0;

  return (
    <div className="scrim" onClick={onCerrar}>
      <div className="modal row" style={{ width: 900, gap: 24 }} onClick={(e) => e.stopPropagation()}>
        <div className="col grow" style={{ gap: 14 }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{tramite.id ? "Editar trámite" : "Nuevo trámite"}</h3>
          <div className="field"><label className="section-label">DEPENDENCIA</label>
            <div className="seg">{DEPENDENCIAS.map((d) => <button key={d} type="button" className={t.dependencia === d ? "on azul" : ""} onClick={() => poner({ dependencia: d as Dependencia })}>{d}</button>)}</div></div>
          <div className="field"><label className="section-label">NOMBRE</label><input className="input" value={t.nombre} onChange={(e) => poner({ nombre: e.target.value })} placeholder="Copia certificada de acta de matrimonio" /></div>
          <div className="field"><label className="section-label">DESCRIPCIÓN</label><input className="input" value={t.descripcion} onChange={(e) => poner({ descripcion: e.target.value })} /></div>
          <div className="field"><label className="section-label">CÓMO SE HACE</label>
            <div className="seg">{(Object.keys(MODALIDADES) as Modalidad[]).map((m) => <button key={m} type="button" className={t.modalidad === m ? "on azul" : ""} onClick={() => poner({ modalidad: m })}>{MODALIDADES[m].nombre}</button>)}</div>
            <span className="muted" style={{ fontSize: 12 }}>{MODALIDADES[t.modalidad].ayuda}</span></div>
          <div className="field"><label className="section-label">REQUISITOS</label>
            {t.requisitos.map((r, i) => (
              <div key={i} className="row" style={{ gap: 8 }}>
                <input className="input grow" value={r} onChange={(e) => poner({ requisitos: t.requisitos.map((x, k) => (k === i ? e.target.value : x)) })} placeholder="INE de quien solicita" />
                <button className="btn ghost" style={{ width: 38, padding: 8 }} type="button" aria-label="Quitar requisito" disabled={t.requisitos.length === 1}
                  onClick={() => poner({ requisitos: t.requisitos.filter((_, k) => k !== i) })}>×</button>
              </div>
            ))}
            <button className="btn ghost" style={{ alignSelf: "flex-start", padding: "7px 12px" }} type="button" onClick={() => poner({ requisitos: [...t.requisitos, ""] })}>+ Requisito</button></div>
          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ width: 140 }}><label className="section-label">COSTO (MXN)</label><input className="input" type="number" min={0} value={t.costo} onChange={(e) => poner({ costo: Math.max(0, +e.target.value), pagoEnLinea: +e.target.value > 0 && t.pagoEnLinea })} /></div>
            <div className="field" style={{ width: 140 }}><label className="section-label">DÍAS HÁBILES</label><input className="input" type="number" min={1} value={t.dias} onChange={(e) => poner({ dias: +e.target.value })} /></div>
          </div>
          {[
            { k: "pagoEnLinea" as const, t: "Se puede pagar en la app", s: "Tarjeta, OXXO o SPEI (simulado por ahora).", off: t.costo === 0 },
            { k: "paraPaisanos" as const, t: "Disponible para paisanos", s: "Un familiar lo recoge con carta poder o se envía por paquetería." },
            { k: "activo" as const, t: "Visible en la app", s: "Apágalo para ocultarlo sin perder el historial." },
          ].map((o) => (
            <div key={o.k} className="row" style={{ alignItems: "center", gap: 14, opacity: o.off ? 0.5 : 1 }}>
              <div className="col grow" style={{ gap: 2 }}><strong style={{ fontSize: 13 }}>{o.t}</strong><span className="muted" style={{ fontSize: 12 }}>{o.s}</span></div>
              <button type="button" disabled={o.off} className={`toggle${t[o.k] ? " on" : ""}`} aria-pressed={t[o.k]} onClick={() => poner({ [o.k]: !t[o.k] })}><span className="knob" /></button>
            </div>
          ))}
          <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button className="btn ghost" type="button" onClick={onCerrar}>Cancelar</button>
            <button className="btn primary" type="button" disabled={!listo} onClick={() => onGuardar({ ...t, nombre: t.nombre.trim(), requisitos: reqs })}>Guardar</button>
          </div>
        </div>

        <div className="col" style={{ width: 290, flex: "0 0 290px", gap: 10 }}>
          <span className="section-label">ASÍ SE VERÁ EN LA APP</span>
          <div className="phone">
            <div className="phone-head"><span className="back">‹</span><div><strong>Trámites</strong><span>{t.dependencia}</span></div></div>
            <div className="col" style={{ gap: 4 }}>
              <strong style={{ fontSize: 16 }}>{t.nombre || "Nombre del trámite"}</strong>
              <span className="s" style={{ fontSize: 12, color: "var(--sec)" }}>{t.descripcion}</span>
            </div>
            <div className="grid2">
              <div className="acard flat"><span className="s">Costo</span><span className="t">{t.costo ? pesos(t.costo) : "Gratis"}</span></div>
              <div className="acard flat"><span className="s">Listo en</span><span className="t">{t.dias} día{t.dias === 1 ? "" : "s"}</span></div>
            </div>
            <span className="section-label">LLEVA O SUBE</span>
            {reqs.length ? reqs.map((r) => <span key={r} style={{ fontSize: 12 }}>☐ {r}</span>) : <span className="s" style={{ fontSize: 12, color: "var(--sec)" }}>Agrega requisitos</span>}
            <div className="acard flat" style={{ background: "var(--brand-soft)" }}>
              <span className="t" style={{ fontSize: 12 }}>{t.modalidad === "en_linea" ? "Sin ir a la oficina" : t.modalidad === "cita" ? "Agenda tu cita · vas una vez" : "Pide y paga aquí · recoges en la oficina"}</span>
              {t.paraPaisanos && <span className="s" style={{ fontSize: 11, color: "var(--sec)" }}>✈ Desde EE. UU.: lo recoge un familiar o te lo enviamos</span>}
            </div>
            <div className="btn primary" style={{ padding: 10 }}>{t.modalidad === "cita" ? "Agendar cita" : t.pagoEnLinea ? `Solicitar y pagar ${pesos(t.costo)}` : "Solicitar"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
