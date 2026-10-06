"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Barras, Kpi, Pestanas } from "@/components/graficas";
import { COLONIAS, ZONAS, haceTexto, registrar } from "@/lib/datos";
import { f, pesos } from "@/lib/almacen";
import {
  listarCalificaciones, listarVecinos, responderCalificacion, type Calificacion, type Vecino,
} from "@/lib/vecinos";
import { ESTADOS, listarSolicitudes, type Solicitud } from "@/lib/tramites";
import {
  CERTAMENES, CONCEPTOS, listarCandidatas, listarPagos, listarVotos, METODOS,
  type Candidata, type Pago, type Voto,
} from "@/lib/feria";

type Vista = "vecinos" | "calificaciones";
const estrellas = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function Crm() {
  const [vista, setVista] = useState<Vista>("vecinos");
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [cals, setCals] = useState<Calificacion[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [votos, setVotos] = useState<Voto[]>([]);
  const [cands, setCands] = useState<Candidata[]>([]);
  const [sols, setSols] = useState<Solicitud[]>([]);

  const cargar = useCallback(async () => {
    const [v, c, p, vo, ca, so] = await Promise.all([listarVecinos(), listarCalificaciones(), listarPagos(), listarVotos(), listarCandidatas(), listarSolicitudes()]);
    setVecinos(v); setCals([...c]); setPagos(p); setVotos(vo); setCands(ca); setSols(so);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const prom = cals.length ? cals.reduce((s, c) => s + c.estrellas, 0) / cals.length : 0;

  return (
    <>
      <Pestanas<Vista> valor={vista} onCambio={setVista} opciones={[
        { id: "vecinos", nombre: "Vecinos", n: vecinos.length },
        { id: "calificaciones", nombre: `Calificaciones · ${prom.toFixed(1)} ★`, n: cals.length },
      ]} />
      {vista === "vecinos"
        ? <Vecinos vecinos={vecinos} cals={cals} pagos={pagos} votos={votos} cands={cands} sols={sols} />
        : <Calificaciones vecinos={vecinos} cals={cals} onCambio={cargar} />}
    </>
  );
}

function Vecinos({ vecinos, cals, pagos, votos, cands, sols }: {
  vecinos: Vecino[]; cals: Calificacion[]; pagos: Pago[]; votos: Voto[]; cands: Candidata[]; sols: Solicitud[];
}) {
  const { sesion } = useAuth();
  const [buscar, setBuscar] = useState("");
  const [colonia, setColonia] = useState("");
  const [tipo, setTipo] = useState("");
  const [compro, setCompro] = useState("");
  const [calif, setCalif] = useState("");
  const [sel, setSel] = useState<Vecino | null>(null);
  const [pagina, setPagina] = useState(0);
  const POR_PAGINA = 25;

  const calDe = useMemo(() => new Map(cals.map((c) => [c.vecinoId, c])), [cals]);
  const comprasDe = useMemo(() => {
    const m = new Map<string, Pago[]>();
    for (const p of pagos) if (p.vecinoId) m.set(p.vecinoId, [...(m.get(p.vecinoId) ?? []), p]);
    return m;
  }, [pagos]);
  const boletosDe = (id: string) => (comprasDe.get(id) ?? []).filter((p) => p.concepto === "boleto" && p.estado === "pagado");

  const q = buscar.trim().toLowerCase();
  const visibles = vecinos.filter((v) => {
    const c = calDe.get(v.id!);
    const b = boletosDe(v.id!).length;
    return (!q || `${v.nombre} ${v.telefono} ${v.origen ?? ""}`.toLowerCase().includes(q))
      && (!colonia || (colonia.startsWith("zona:") ? COLONIAS.find((c) => c.nombre === v.colonia)?.zona === colonia.slice(5) : v.colonia === colonia))
      && (!tipo || v.tipo === tipo)
      && (!compro || (compro === "si" ? b > 0 : b === 0))
      && (!calif || (calif === "sin" ? !c : calif === "baja" ? c && c.estrellas <= 2 : c && c.estrellas >= 4));
  });
  useEffect(() => setPagina(0), [buscar, colonia, tipo, compro, calif]);

  const activos = vecinos.filter((v) => Date.now() - +f(v.ultimaVez) < 7 * 86400_000).length;
  const compradores = vecinos.filter((v) => boletosDe(v.id!).length > 0).length;
  const gastoBoletos = vecinos.reduce((s, v) => s + boletosDe(v.id!).reduce((x, p) => x + p.monto, 0), 0);

  const porColonia = COLONIAS.map((c) => ({
    etiqueta: c.nombre,
    valor: visibles.filter((v) => v.colonia === c.nombre).length,
    detalle: `${visibles.filter((v) => v.colonia === c.nombre && v.tipo === "paisano").length} son paisanos`,
  }));

  async function exportar() {
    const filas = [["Nombre", "Teléfono", "Colonia", "Tipo", "Origen", "Plataforma", "Registro", "Última vez", "Calificación", "Boletos", "Gasto boletos"]];
    for (const v of visibles) {
      const b = boletosDe(v.id!);
      filas.push([v.nombre, v.telefono, v.colonia, v.tipo, v.origen ?? "", v.plataforma,
        f(v.registradoEn).toLocaleDateString("es-MX"), f(v.ultimaVez).toLocaleDateString("es-MX"),
        String(calDe.get(v.id!)?.estrellas ?? ""), String(b.reduce((s, p) => s + (p.cantidad ?? 0), 0)), String(b.reduce((s, p) => s + p.monto, 0))]);
    }
    const csv = filas.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "vecinos.csv"; a.click();
    URL.revokeObjectURL(url);
    // Los datos personales salen del sistema: queda registrado quién y cuántos
    await registrar("Exportó vecinos", `${visibles.length} registros`, "interno", sesion!.nombre);
  }

  return (
    <>
      <div className="row">
        <Kpi n={vecinos.length} t="Vecinos registrados" s={`${vecinos.filter((v) => v.tipo === "paisano").length} paisanos en EE. UU.`} />
        <Kpi n={`${Math.round((activos / Math.max(1, vecinos.length)) * 100)}%`} t="Activos esta semana" s={`${activos} abrieron la app en 7 días`} />
        <Kpi n={compradores} t="Compraron boletos" s={`${pesos(gastoBoletos)} en total`} />
        <Kpi n={`${Math.round((vecinos.filter((v) => v.notificaciones).length / Math.max(1, vecinos.length)) * 100)}%`} t="Con notificaciones" s="Les llegan los avisos" />
      </div>

      <div className="row">
        <div className="card grow col" style={{ gap: 0, paddingBottom: 8 }}>
          <div className="row" style={{ gap: 8, paddingBottom: 12, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: "1 1 220px" }} placeholder="Buscar nombre, teléfono o ciudad" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            <select className="select" style={{ width: 200 }} value={colonia} onChange={(e) => setColonia(e.target.value)}>
              <option value="">Todas las zonas</option>
              {ZONAS.map((z) => (
                <optgroup key={z} label={z}>
                  <option value={`zona:${z}`}>Toda la zona</option>
                  {COLONIAS.filter((c) => c.zona === z).map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                </optgroup>
              ))}
            </select>
            <select className="select" style={{ width: 140 }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Locales y paisanos</option><option value="local">Locales</option><option value="paisano">Paisanos</option>
            </select>
            <select className="select" style={{ width: 160 }} value={compro} onChange={(e) => setCompro(e.target.value)}>
              <option value="">Con y sin boletos</option><option value="si">Compraron boletos</option><option value="no">No han comprado</option>
            </select>
            <select className="select" style={{ width: 160 }} value={calif} onChange={(e) => setCalif(e.target.value)}>
              <option value="">Cualquier calificación</option><option value="alta">4 – 5 estrellas</option><option value="baja">1 – 2 estrellas</option><option value="sin">Sin calificar</option>
            </select>
            <button className="btn ghost" type="button" onClick={exportar}>Exportar {visibles.length}</button>
          </div>
          <table className="tabla">
            <thead><tr><th>VECINO</th><th>ZONA</th><th>TIPO</th><th>REGISTRO</th><th>ÚLTIMA VEZ</th><th>CALIFICÓ</th><th className="num">BOLETOS</th></tr></thead>
            <tbody>
              {visibles.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA).map((v) => {
                const c = calDe.get(v.id!);
                const b = boletosDe(v.id!);
                return (
                  <tr key={v.id} className={`click${sel?.id === v.id ? " sel" : ""}`} onClick={() => setSel(v)}>
                    <td><div className="row" style={{ gap: 10, alignItems: "center" }}>
                      <span className="avatar">{v.nombre[0]}</span>
                      <div><strong>{v.nombre}</strong><div className="muted" style={{ fontSize: 11 }}>{v.telefono} · {v.plataforma}</div></div>
                    </div></td>
                    <td>{v.colonia}</td>
                    <td>{v.tipo === "paisano" ? <span className="tag azul">✈ {v.origen}</span> : <span className="tag gris">Local</span>}</td>
                    <td className="muted">{f(v.registradoEn).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit" })}</td>
                    <td className="muted">{haceTexto(v.ultimaVez)}</td>
                    <td>{c ? <span className="stars">{estrellas(c.estrellas)}</span> : <span className="muted">—</span>}</td>
                    <td className="num">{b.length ? <><strong>{b.reduce((s, p) => s + (p.cantidad ?? 0), 0)}</strong><div className="muted" style={{ fontSize: 11 }}>{pesos(b.reduce((s, p) => s + p.monto, 0))}</div></> : <span className="muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {visibles.length ? `${pagina * POR_PAGINA + 1}–${Math.min(visibles.length, (pagina + 1) * POR_PAGINA)} de ${visibles.length}` : "Nadie coincide con los filtros."}
            </span>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
              <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" disabled={(pagina + 1) * POR_PAGINA >= visibles.length} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
            </div>
          </div>
        </div>

        <div className="card col" style={{ gap: 14, width: 360, flex: "0 0 360px" }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Vecinos por zona</h3>
            <span className="muted" style={{ fontSize: 12 }}>Con los filtros actuales</span>
          </div>
          <Barras datos={porColonia} formato={(n) => String(n)} titulo="Vecinos por zona" />
        </div>
      </div>

      {sel && <Ficha v={sel} cal={calDe.get(sel.id!)} compras={comprasDe.get(sel.id!) ?? []} votos={votos.filter((x) => x.vecinoId === sel.id)} cands={cands} tramites={sols.filter((x) => x.vecinoId === sel.id)} onCerrar={() => setSel(null)} />}
    </>
  );
}

function Ficha({ v, cal, compras, votos, cands, tramites, onCerrar }: {
  v: Vecino; cal?: Calificacion; compras: Pago[]; votos: Voto[]; cands: Candidata[]; tramites: Solicitud[]; onCerrar: () => void;
}) {
  const total = compras.filter((p) => p.estado === "pagado").reduce((s, p) => s + p.monto, 0);
  return (
    <div className="drawer">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <span className="section-label">FICHA DEL VECINO</span>
        <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" onClick={onCerrar}>Cerrar</button>
      </div>
      <div className="row" style={{ gap: 12, alignItems: "center" }}>
        <span className="avatar" style={{ width: 48, height: 48, fontSize: 18, flex: "0 0 48px" }}>{v.nombre[0]}</span>
        <div className="col" style={{ gap: 2 }}>
          <strong style={{ fontSize: 18 }}>{v.nombre}</strong>
          <span className="muted" style={{ fontSize: 13 }}>{v.telefono} · {v.plataforma}</span>
        </div>
      </div>
      <div className="grid2">
        <div className="acard flat"><span className="s">Zona</span><span className="t">{v.colonia}</span></div>
        <div className="acard flat"><span className="s">Tipo</span><span className="t">{v.tipo === "paisano" ? `Paisano · ${v.origen}` : "Local"}</span></div>
        <div className="acard flat"><span className="s">Registro</span><span className="t">{f(v.registradoEn).toLocaleDateString("es-MX", { dateStyle: "medium" })}</span></div>
        <div className="acard flat"><span className="s">Última vez</span><span className="t">{haceTexto(v.ultimaVez)}</span></div>
      </div>

      <div className="col" style={{ gap: 6 }}>
        <span className="section-label">CALIFICACIÓN DE LA APP</span>
        {cal ? (
          <div className="acard">
            <span className="stars">{estrellas(cal.estrellas)}</span>
            {cal.comentario && <span style={{ fontSize: 13 }}>“{cal.comentario}”</span>}
            <span className="s">Versión {cal.version} · {haceTexto(cal.creadoEn)}</span>
          </div>
        ) : <span className="muted" style={{ fontSize: 13 }}>No ha calificado.</span>}
      </div>

      <div className="col" style={{ gap: 6 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="section-label">COMPRAS Y PAGOS · {compras.length}</span>
          <strong style={{ fontSize: 13 }}>{pesos(total)}</strong>
        </div>
        {compras.length === 0 && <span className="muted" style={{ fontSize: 13 }}>No ha comprado nada en la app.</span>}
        {[...compras].sort((a, b) => +f(b.creadoEn) - +f(a.creadoEn)).map((p) => (
          <div key={p.id} className="acard">
            <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
              <span className="t" style={{ fontSize: 13 }}>{p.descripcion}</span>
              <strong style={{ fontSize: 13 }}>{pesos(p.monto)}</strong>
            </div>
            <span className="s">
              {CONCEPTOS[p.concepto]}{p.cantidad ? ` · ${p.cantidad} boleto(s)` : ""} · {METODOS[p.metodo]} · {f(p.creadoEn).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            <div className="row" style={{ gap: 6 }}>
              <span className="tag gris">{p.folio}</span>
              {p.estado === "pendiente" && <span className="tag naranja">Pago pendiente</span>}
              {p.estado === "reembolsado" && <span className="tag gris">Reembolsado</span>}
              {p.usado && <span className="tag azul">Ya entró</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="col" style={{ gap: 6 }}>
        <span className="section-label">TRÁMITES · {tramites.length}</span>
        {tramites.length === 0 && <span className="muted" style={{ fontSize: 13 }}>No ha hecho trámites desde la app.</span>}
        {tramites.map((t) => (
          <div key={t.id} className="acard" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div className="col" style={{ gap: 2 }}>
              <span className="t" style={{ fontSize: 13 }}>{t.tramite}</span>
              <span className="s">{t.folio} · {t.dependencia} · {haceTexto(t.creadoEn)}</span>
            </div>
            <span className={`tag ${ESTADOS[t.estado].color}`}>{ESTADOS[t.estado].nombre}</span>
          </div>
        ))}
      </div>

      <div className="col" style={{ gap: 6 }}>
        <span className="section-label">PARTICIPACIÓN</span>
        {votos.length === 0 && <span className="muted" style={{ fontSize: 13 }}>No ha votado en los certámenes.</span>}
        {votos.map((x) => (
          <span key={x.id} style={{ fontSize: 13 }}>
            Votó en {CERTAMENES[x.certamen]} · <strong>{cands.find((c) => c.id === x.candidataId)?.nombre}</strong>
          </span>
        ))}
        <span className="muted" style={{ fontSize: 12 }}>{v.notificaciones ? "Recibe notificaciones" : "Tiene las notificaciones apagadas"}</span>
      </div>
    </div>
  );
}

function Calificaciones({ vecinos, cals, onCambio }: { vecinos: Vecino[]; cals: Calificacion[]; onCambio: () => Promise<void> }) {
  const { sesion } = useAuth();
  const [filtro, setFiltro] = useState<number | 0>(0);
  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const vecinoDe = new Map(vecinos.map((v) => [v.id, v]));
  const prom = cals.length ? cals.reduce((s, c) => s + c.estrellas, 0) / cals.length : 0;
  const dist = [5, 4, 3, 2, 1].map((e) => ({ etiqueta: `${e} ★`, valor: cals.filter((c) => c.estrellas === e).length, detalle: `${e} estrellas` }));
  const lista = cals.filter((c) => c.comentario && (!filtro || c.estrellas === filtro)).sort((a, b) => +f(b.creadoEn) - +f(a.creadoEn));

  return (
    <div className="row">
      <div className="col" style={{ width: 360, flex: "0 0 360px", gap: 16 }}>
        <div className="card col" style={{ gap: 6 }}>
          <span className="section-label">CALIFICACIÓN PROMEDIO</span>
          <div className="row" style={{ gap: 10, alignItems: "baseline" }}>
            <span className="big">{prom.toFixed(1)}</span>
            <span className="stars" style={{ fontSize: 18 }}>{estrellas(Math.round(prom))}</span>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>{cals.length} calificaciones · {Math.round((cals.length / Math.max(1, vecinos.length)) * 100)}% de los vecinos</span>
        </div>
        <div className="card col" style={{ gap: 12 }}>
          <h3 className="h3">Distribución</h3>
          <Barras datos={dist} formato={(n) => String(n)} titulo="Calificaciones por estrellas" />
        </div>
      </div>

      <div className="card grow col" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="h3">Lo que dicen</h3>
          <div className="seg">
            {[0, 5, 4, 3, 2, 1].map((e) => (
              <button key={e} type="button" className={filtro === e ? "on azul" : ""} onClick={() => setFiltro(e)}>{e ? `${e} ★` : "Todas"}</button>
            ))}
          </div>
        </div>
        {lista.length === 0 && <span className="muted">No hay comentarios con este filtro.</span>}
        {lista.map((c) => {
          const v = vecinoDe.get(c.vecinoId);
          return (
            <div key={c.id} className="acard" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div className="row" style={{ gap: 10, alignItems: "center" }}>
                  <span className="avatar">{v?.nombre[0]}</span>
                  <div><strong style={{ fontSize: 13 }}>{v?.nombre}</strong>
                    <div className="muted" style={{ fontSize: 11 }}>{v?.tipo === "paisano" ? `Paisano · ${v.origen}` : v?.colonia} · v{c.version} · {haceTexto(c.creadoEn)}</div></div>
                </div>
                <span className="stars">{estrellas(c.estrellas)}</span>
              </div>
              <span style={{ fontSize: 14 }}>{c.comentario}</span>
              {c.respuesta && <div className="acard flat"><span className="s">Respuesta del ayuntamiento</span><span style={{ fontSize: 13 }}>{c.respuesta}</span></div>}
              {!c.respuesta && respondiendo !== c.id && (
                <button className="btn ghost" style={{ alignSelf: "flex-start", padding: "6px 10px" }} type="button" onClick={() => { setRespondiendo(c.id!); setTexto(""); }}>Responder</button>
              )}
              {respondiendo === c.id && (
                <div className="col" style={{ gap: 8 }}>
                  <textarea className="textarea" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Gracias por avisarnos. Ya revisamos…" />
                  <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn ghost" type="button" onClick={() => setRespondiendo(null)}>Cancelar</button>
                    <button className="btn primary" type="button" disabled={!texto.trim()} onClick={async () => {
                      await responderCalificacion(c, texto.trim());
                      await registrar("Respondió calificación", `${v?.nombre} · ${c.estrellas} ★`, "publico", sesion!.nombre);
                      setRespondiendo(null); await onCambio();
                    }}>Publicar respuesta</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
