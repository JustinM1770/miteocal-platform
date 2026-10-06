"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import Mapa, { type Globo, type Linea, type Marcador } from "@/components/Mapa";
import { COLONIAS, alcanceDe, publicar } from "@/lib/datos";
import { avances, horaEn, masCercano, trazarPorCalles, type Punto } from "@/lib/mapas";
import { COLORES_RUTA, DIAS, guardarRuta, hoy, listarRutas, type RutaBasura } from "@/lib/basura";

const NUEVA: RutaBasura = { nombre: "", unidad: "", chofer: "", color: COLORES_RUTA[0], dias: [], inicio: "07:00", fin: "09:00", colonias: [], puntos: [], trazo: [], metros: 0, activa: true };
const km = (m: number) => `${(m / 1000).toFixed(1)} km`;

export default function RutasBasura() {
  const { sesion } = useAuth();
  const [rutas, setRutas] = useState<RutaBasura[]>([]);
  const [trazos, setTrazos] = useState<Record<string, Punto[]>>({});
  const [selId, setSelId] = useState<string | null>(null);
  const [edit, setEdit] = useState<RutaBasura | null>(null);
  const [trazando, setTrazando] = useState(false);
  const [globo, setGlobo] = useState<Globo | null>(null);
  const [avisando, setAvisando] = useState(false);

  const cargar = useCallback(async () => setRutas([...(await listarRutas())]), []);
  useEffect(() => { cargar(); }, [cargar]);

  // Rutas guardadas sin trazo (p. ej. las de ejemplo): se ajustan a las calles al mostrarlas
  useEffect(() => {
    rutas.filter((r) => !r.trazo.length && r.puntos.length > 1 && !trazos[r.id!]).forEach(async (r) => {
      const t = await trazarPorCalles(r.puntos);
      setTrazos((x) => ({ ...x, [r.id!]: t?.trazo ?? r.puntos }));
    });
  }, [rutas, trazos]);

  // Al mover puntos en edición, se vuelve a ajustar a las calles
  const clavePuntos = edit ? JSON.stringify(edit.puntos) : "";
  useEffect(() => {
    if (!edit) return;
    if (edit.puntos.length < 2) { setEdit((e) => e && { ...e, trazo: [], metros: 0 }); return; }
    setTrazando(true);
    const id = setTimeout(async () => {
      const t = await trazarPorCalles(edit.puntos);
      setEdit((e) => e && { ...e, trazo: t?.trazo ?? e.puntos, metros: t?.metros ?? 0 });
      setTrazando(false);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavePuntos]);

  const trazoDe = (r: RutaBasura) => (r.trazo.length ? r.trazo : trazos[r.id!] ?? r.puntos);
  const sel = rutas.find((r) => r.id === selId) ?? null;
  const visible = edit ?? sel;

  const lineas = useMemo<Linea[]>(() => {
    if (edit) return [{ id: "edit", puntos: edit.trazo.length ? edit.trazo : edit.puntos, color: edit.color, ancho: 6, punteada: !edit.trazo.length }];
    return rutas.filter((r) => r.activa).map((r) => ({ id: r.id!, puntos: trazoDe(r), color: r.color, ancho: r.id === selId ? 7 : selId ? 3 : 5 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit, rutas, trazos, selId]);

  const marcadores = useMemo<Marcador[]>(() => {
    if (!visible) return [];
    const t = trazoDe(visible);
    const av = avances(t);
    return visible.puntos.map((p, i) => {
      const hora = t.length > 1 ? horaEn(visible.inicio, visible.fin, av[masCercano(t, p).i]) : "";
      return {
        id: `p${i}`, punto: p, color: i === 0 ? "#12a150" : i === visible.puntos.length - 1 ? "#d93a3a" : visible.color,
        texto: edit ? String(i + 1) : i === 0 ? "Sale" : i === visible.puntos.length - 1 ? "Fin" : "",
        onClick: () => setGlobo({ punto: p, titulo: `${i === 0 ? "Salida" : i === visible.puntos.length - 1 ? "Fin" : `Punto ${i + 1}`} · ~${hora}`, lineas: [visible.nombre || "Ruta nueva"] }),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, trazos]);

  function clicMapa(p: Punto) {
    if (edit) { setEdit({ ...edit, puntos: [...edit.puntos, p] }); return; }
    // ¿A qué hora pasa por aquí? Busca la ruta más cercana
    const candidatas = (sel ? [sel] : rutas.filter((r) => r.activa)).map((r) => ({ r, t: trazoDe(r) })).filter((x) => x.t.length > 1);
    let mejor: { r: RutaBasura; i: number; metros: number; t: Punto[] } | null = null;
    for (const c of candidatas) { const m = masCercano(c.t, p); if (!mejor || m.metros < mejor.metros) mejor = { r: c.r, ...m, t: c.t }; }
    if (!mejor || mejor.metros > 120) { setGlobo({ punto: p, titulo: "Aquí no pasa ninguna ruta", lineas: ["El vecino verá «Sin recolección en tu calle»."] }); return; }
    const hora = horaEn(mejor.r.inicio, mejor.r.fin, avances(mejor.t)[mejor.i]);
    setGlobo({ punto: mejor.t[mejor.i], titulo: `Pasa ~${hora}`, lineas: [`${mejor.r.nombre} · ${mejor.r.unidad}`, `Días: ${mejor.r.dias.join(" ")}`] });
  }

  const ajustar = useMemo(() => {
    const r = edit ? null : sel;
    if (r) return { clave: `r-${r.id}`, puntos: trazoDe(r) };
    if (!edit) return { clave: `todas-${rutas.length}`, puntos: rutas.flatMap((x) => x.puntos) };
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, edit === null, rutas.length]);

  const deHoy = rutas.filter((r) => r.activa && r.dias.includes(hoy()));

  return (
    <div className="row" style={{ alignItems: "stretch" }}>
      <div className="col" style={{ width: 380, flex: "0 0 380px", gap: 12 }}>
        {edit ? (
          <Editor ruta={edit} trazando={trazando} onCambio={setEdit} onCancelar={() => { setEdit(null); setGlobo(null); }}
            onGuardar={async () => { await guardarRuta(edit, sesion!.nombre); setEdit(null); await cargar(); }} />
        ) : (
          <>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted" style={{ fontSize: 13 }}>Hoy ({hoy()}) salen {deHoy.length} ruta{deHoy.length === 1 ? "" : "s"}</span>
              <button className="btn primary" type="button" onClick={() => { setSelId(null); setGlobo(null); setEdit({ ...NUEVA, color: COLORES_RUTA[rutas.length % COLORES_RUTA.length] }); }}>Nueva ruta</button>
            </div>
            {rutas.length === 0 && <div className="card muted">No hay rutas. Crea la primera marcando en el mapa por dónde pasa el camión.</div>}
            {rutas.map((r) => (
              <button key={r.id} type="button" className="card col" style={{ gap: 8, textAlign: "left", cursor: "pointer", borderColor: selId === r.id ? r.color : undefined, borderWidth: selId === r.id ? 2 : 1, opacity: r.activa ? 1 : 0.5 }}
                onClick={() => { setSelId(selId === r.id ? null : r.id!); setGlobo(null); }}>
                <div className="row" style={{ gap: 10, alignItems: "center" }}>
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: r.color, flex: "0 0 12px" }} />
                  <strong className="grow">{r.nombre}</strong>
                  {r.dias.includes(hoy()) && r.activa && <span className="tag verde">Hoy</span>}
                </div>
                <span className="muted" style={{ fontSize: 12 }}>{r.unidad}{r.chofer ? ` · ${r.chofer}` : ""} · {r.inicio}–{r.fin} · {km(r.metros || 0) === "0.0 km" ? `${r.puntos.length} puntos` : km(r.metros)}</span>
                <div className="dias">{DIAS.map((d) => <span key={d} className={`dia${r.dias.includes(d) ? " on" : ""}`} style={{ width: 28, height: 28, fontSize: 11 }}>{d}</span>)}</div>
                <span className="muted" style={{ fontSize: 12 }}>{r.colonias.join(", ") || "Sin colonias asignadas"}</span>
                {selId === r.id && (
                  <div className="row" style={{ gap: 8 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn ghost" style={{ padding: "7px 12px" }} type="button" onClick={() => { setEdit({ ...r, puntos: [...r.puntos], trazo: trazoDe(r) }); setGlobo(null); }}>Editar ruta</button>
                    <button className="btn ghost" style={{ padding: "7px 12px" }} type="button" onClick={() => setAvisando(true)}>Avisar a vecinos</button>
                  </div>
                )}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="col grow" style={{ gap: 8 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          {edit ? "Toca el mapa en orden por donde pasa el camión. La ruta se ajusta sola a las calles."
            : "Toca cualquier calle para ver a qué hora pasa el camión, igual que lo verá el vecino."}
        </span>
        <Mapa alto="calc(100vh - 230px)" lineas={lineas} marcadores={marcadores} globo={globo} onClick={clicMapa} ajustar={ajustar} editando={Boolean(edit)} />
      </div>

      {avisando && sel && <Aviso ruta={sel} onCerrar={() => setAvisando(false)} />}
    </div>
  );
}

function Editor({ ruta, trazando, onCambio, onCancelar, onGuardar }: {
  ruta: RutaBasura; trazando: boolean; onCambio: (r: RutaBasura) => void; onCancelar: () => void; onGuardar: () => Promise<void>;
}) {
  const [guardando, setGuardando] = useState(false);
  const poner = (c: Partial<RutaBasura>) => onCambio({ ...ruta, ...c });
  const listo = ruta.nombre.trim() && ruta.unidad.trim() && ruta.dias.length && ruta.puntos.length >= 2 && ruta.inicio < ruta.fin && !trazando;

  return (
    <div className="card col" style={{ gap: 14, overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
      <h3 className="h3">{ruta.id ? "Editar ruta" : "Nueva ruta"}</h3>
      <div className="field"><label className="section-label">NOMBRE</label><input className="input" value={ruta.nombre} onChange={(e) => poner({ nombre: e.target.value })} placeholder="Ruta Centro" /></div>
      <div className="row" style={{ gap: 10 }}>
        <div className="field grow"><label className="section-label">UNIDAD</label><input className="input" value={ruta.unidad} onChange={(e) => poner({ unidad: e.target.value })} placeholder="Unidad 04" /></div>
        <div className="field grow"><label className="section-label">CHOFER · OPCIONAL</label><input className="input" value={ruta.chofer} onChange={(e) => poner({ chofer: e.target.value })} /></div>
      </div>
      <div className="field"><label className="section-label">DÍAS QUE PASA</label>
        <div className="dias">{DIAS.map((d) => (
          <button key={d} type="button" className={`dia${ruta.dias.includes(d) ? " on" : ""}`} aria-pressed={ruta.dias.includes(d)}
            onClick={() => poner({ dias: DIAS.filter((x) => (x === d ? !ruta.dias.includes(d) : ruta.dias.includes(x))) })}>{d}</button>
        ))}</div></div>
      <div className="row" style={{ gap: 10 }}>
        <div className="field grow"><label className="section-label">SALE</label><input className="input" type="time" value={ruta.inicio} onChange={(e) => poner({ inicio: e.target.value })} /></div>
        <div className="field grow"><label className="section-label">TERMINA</label><input className="input" type="time" value={ruta.fin} onChange={(e) => poner({ fin: e.target.value })} /></div>
      </div>
      <div className="field"><label className="section-label">COLONIAS QUE CUBRE</label>
        <div className="seg">{COLONIAS.map((c) => (
          <button key={c.nombre} type="button" className={ruta.colonias.includes(c.nombre) ? "on verde" : ""}
            onClick={() => poner({ colonias: ruta.colonias.includes(c.nombre) ? ruta.colonias.filter((x) => x !== c.nombre) : [...ruta.colonias, c.nombre] })}>{c.nombre}</button>
        ))}</div></div>
      <div className="field"><label className="section-label">COLOR EN EL MAPA</label>
        <div className="row" style={{ gap: 8 }}>{COLORES_RUTA.map((c) => (
          <button key={c} type="button" aria-label="Color" onClick={() => poner({ color: c })} style={{ width: 28, height: 28, borderRadius: 8, background: c, border: ruta.color === c ? "3px solid var(--ink)" : "2px solid #fff", boxShadow: "0 0 0 1px var(--border)" }} />
        ))}</div></div>

      <div className="acard flat" style={{ gap: 8 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: 13 }}>Recorrido</strong>
          <span className="muted" style={{ fontSize: 12 }}>{trazando ? "Ajustando a las calles…" : ruta.metros ? `${km(ruta.metros)} · ${ruta.puntos.length} puntos` : `${ruta.puntos.length} puntos`}</span>
        </div>
        <span className="muted" style={{ fontSize: 12 }}>{ruta.puntos.length < 2 ? "Toca el mapa para marcar la salida y los puntos por donde pasa." : "Sigue tocando para alargar la ruta."}</span>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" disabled={!ruta.puntos.length} onClick={() => poner({ puntos: ruta.puntos.slice(0, -1) })}>Deshacer punto</button>
          <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" disabled={!ruta.puntos.length} onClick={() => poner({ puntos: [], trazo: [], metros: 0 })}>Borrar recorrido</button>
          <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" disabled={ruta.puntos.length < 3} title="Regresa al punto de salida"
            onClick={() => poner({ puntos: [...ruta.puntos, ruta.puntos[0]] })}>Cerrar circuito</button>
        </div>
      </div>

      <div className="row" style={{ alignItems: "center", gap: 14 }}>
        <div className="col grow" style={{ gap: 2 }}><strong style={{ fontSize: 13 }}>Ruta activa</strong><span className="muted" style={{ fontSize: 12 }}>Apágala para suspenderla sin borrarla.</span></div>
        <button type="button" className={`toggle${ruta.activa ? " on" : ""}`} aria-pressed={ruta.activa} onClick={() => poner({ activa: !ruta.activa })}><span className="knob" /></button>
      </div>

      <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
        <button className="btn ghost" type="button" onClick={onCancelar}>Cancelar</button>
        <button className="btn primary" type="button" disabled={!listo || guardando} onClick={async () => { setGuardando(true); await onGuardar(); }}>
          {guardando ? "Guardando…" : "Guardar ruta"}
        </button>
      </div>
    </div>
  );
}

function Aviso({ ruta, onCerrar }: { ruta: RutaBasura; onCerrar: () => void }) {
  const { sesion } = useAuth();
  const [mensaje, setMensaje] = useState("");
  const [notificar, setNotificar] = useState(true);
  const [listo, setListo] = useState(false);
  const alcance = ruta.colonias.reduce((s, c) => s + alcanceDe(c), 0);
  const RAPIDOS = ["Hoy el camión va con 30 minutos de retraso.", "Hoy no pasa el camión por falla mecánica. Pasa mañana.", "Hoy pasa más temprano de lo normal."];

  return (
    <div className="scrim" onClick={onCerrar}>
      <div className="modal col" style={{ width: 520, gap: 14 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Avisar a los vecinos de {ruta.nombre}</h3>
        <span className="muted" style={{ fontSize: 13 }}>Le llega a {alcance} vecinos de {ruta.colonias.join(", ") || "la ruta"} y aparece en «Basura en vivo».</span>
        <div className="chips">{RAPIDOS.map((m) => <button key={m} type="button" className="chip" onClick={() => setMensaje(m)}>{m}</button>)}</div>
        <textarea className="textarea" value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Qué pasa con el camión hoy" />
        <div className="row" style={{ alignItems: "center", gap: 14 }}>
          <div className="col grow"><strong style={{ fontSize: 13 }}>Enviar notificación</strong><span className="muted" style={{ fontSize: 12 }}>No se puede deshacer.</span></div>
          <button type="button" className={`toggle${notificar ? " on" : ""}`} aria-pressed={notificar} onClick={() => setNotificar((v) => !v)}><span className="knob" /></button>
        </div>
        {listo && <div className="banner" style={{ background: "var(--ok-soft)" }}><strong>Aviso publicado.</strong></div>}
        <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
          <button className="btn ghost" type="button" onClick={onCerrar}>{listo ? "Cerrar" : "Cancelar"}</button>
          {!listo && <button className="btn primary" type="button" disabled={!mensaje.trim()} onClick={async () => {
            await publicar({
              tipo: "basura", canal: "publico", colonia: ruta.colonias.length === 1 ? ruta.colonias[0] : null, estado: null,
              titulo: `${ruta.nombre} · ${ruta.unidad}`, mensaje: mensaje.trim(), horaEstimada: null,
              publicarEn: new Date(), caducaEn: new Date(Date.now() + 12 * 3600_000), notificar, alcance,
              autorNombre: sesion!.nombre, autorUid: sesion!.uid, datos: { ruta: ruta.id ?? "", dias: ruta.dias.join(","), hora: ruta.inicio },
            }, "Avisó cambio en ruta de basura");
            setListo(true);
          }}>{notificar ? `Publicar y notificar a ${alcance}` : "Publicar"}</button>}
        </div>
      </div>
    </div>
  );
}
