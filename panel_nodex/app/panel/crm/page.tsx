"use client";

import { useCallback, useEffect, useState } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import Modal from "@/components/Modal";
import { Barras, Kpi, Pestanas } from "@/components/graficas";
import { enviarAviso, haceTexto, registrar, type Segmento } from "@/lib/datos";
import { alcanceDe, cfg, colonias, coloniasDeZona, zonas } from "@/lib/config";
import { f, pesos } from "@/lib/almacen";
import {
  calificacionDe, contarVecinos, listarCalificaciones, paginaVecinos, responderCalificacion,
  type Calificacion, type Vecino,
} from "@/lib/vecinos";
import { CERTAMENES, CONCEPTOS, METODOS, listarCandidatas, listarEventos, pagosDe, votosDe, type Candidata, type Evento, type Pago, type Voto } from "@/lib/feria";
import { ESTADOS, solicitudesDe, type Solicitud } from "@/lib/tramites";

/* Solo administradores (lo exige la regla de usuarios/ y el menú): son datos
   personales. Los vecinos se cargan por páginas; los totales se cuentan en
   el servidor; el detalle de cada persona se pide al abrir su ficha. */

type Vista = "vecinos" | "calificaciones";
const estrellas = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function Crm() {
  const [vista, setVista] = useState<Vista>("vecinos");
  const [cals, setCals] = useState<Calificacion[]>([]);
  const cargarCals = useCallback(async () => setCals([...(await listarCalificaciones())]), []);
  useEffect(() => { cargarCals(); }, [cargarCals]);
  const prom = cals.length ? cals.reduce((s, c) => s + c.estrellas, 0) / cals.length : 0;

  return (
    <>
      <Pestanas<Vista> valor={vista} onCambio={setVista} opciones={[
        { id: "vecinos", nombre: "Vecinos" },
        { id: "calificaciones", nombre: `Calificaciones · ${prom.toFixed(1)} ★`, n: cals.length },
      ]} />
      {vista === "vecinos" ? <Vecinos /> : <Calificaciones cals={cals} onCambio={cargarCals} />}
    </>
  );
}

function Vecinos() {
  const { sesion } = useAuth();
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [totales, setTotales] = useState<{ todos: number; paisanos: number } | null>(null);
  const [buscar, setBuscar] = useState("");
  const [colonia, setColonia] = useState("");
  const [tipo, setTipo] = useState("");
  const [compro, setCompro] = useState("");
  const [calif, setCalif] = useState("");
  const [sel, setSel] = useState<Vecino | null>(null);
  const [avisando, setAvisando] = useState(false);
  const [mostrar, setMostrar] = useState(25);

  const masVecinos = useCallback(async (desde: QueryDocumentSnapshot<DocumentData> | null) => {
    setCargando(true);
    const p = await paginaVecinos(desde);
    setVecinos((l) => (desde ? [...l, ...p.items] : p.items));
    setCursor(p.cursor); setHayMas(p.hayMas); setCargando(false);
  }, []);

  useEffect(() => {
    masVecinos(null);
    Promise.all([contarVecinos(), contarVecinos({ tipo: "paisano" })]).then(([todos, paisanos]) => setTotales({ todos, paisanos }));
  }, [masVecinos]);

  const q = buscar.trim().toLowerCase();
  const enZona = (v: Vecino) => colonia.startsWith("zona:")
    ? (colonias().find((c) => c.nombre === v.colonia)?.zona || "Sin zona") === colonia.slice(5)
    : v.colonia === colonia;
  const visibles = vecinos.filter((v) => {
    const b = v.resumen?.boletos ?? 0;
    const e = v.resumen?.estrellas ?? null;
    return (!q || `${v.nombre} ${v.telefono} ${v.origen ?? ""}`.toLowerCase().includes(q))
      && (!colonia || enZona(v))
      && (!tipo || v.tipo === tipo)
      && (!compro || (compro === "si" ? b > 0 : b === 0))
      && (!calif || (calif === "sin" ? e === null : calif === "baja" ? e !== null && e <= 2 : e !== null && e >= 4));
  });
  useEffect(() => setMostrar(25), [buscar, colonia, tipo, compro, calif]);

  const activos = vecinos.filter((v) => Date.now() - +f(v.ultimaVez) < 7 * 86400_000).length;
  const compradores = vecinos.filter((v) => (v.resumen?.boletos ?? 0) > 0);

  // Con estadísticas del servidor se grafica todo el municipio; si no, lo cargado
  const porColonia = colonias().map((c) => ({
    etiqueta: c.nombre,
    valor: alcanceDe(c.nombre) ?? vecinos.filter((v) => v.colonia === c.nombre).length,
  }));

  /** El segmento de los filtros actuales, para avisar solo a esas personas */
  const segmento: Segmento = {
    colonias: !colonia ? null : colonia.startsWith("zona:") ? coloniasDeZona(colonia.slice(5)).map((c) => c.nombre) : [colonia],
    tipo: (tipo || null) as Segmento["tipo"],
    compradoresDe: compro === "si" ? "cualquier-evento" : null,
    descripcion: [colonia ? (colonia.startsWith("zona:") ? colonia.slice(5) : colonia) : "todo el municipio", tipo === "paisano" ? "paisanos" : tipo === "local" ? "locales" : "", compro === "si" ? "que compraron boletos" : ""].filter(Boolean).join(" · "),
  };

  async function exportar() {
    const filas = [["Nombre", "Teléfono", "Colonia", "Tipo", "Origen", "Plataforma", "Registro", "Última vez", "Calificación", "Boletos", "Gasto boletos"]];
    for (const v of visibles) {
      filas.push([v.nombre, v.telefono, v.colonia, v.tipo, v.origen ?? "", v.plataforma,
        f(v.registradoEn).toLocaleDateString("es-MX"), f(v.ultimaVez).toLocaleDateString("es-MX"),
        String(v.resumen?.estrellas ?? ""), String(v.resumen?.boletos ?? 0), String(v.resumen?.gasto ?? 0)]);
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
        <Kpi n={totales?.todos ?? "…"} t="Vecinos registrados" s={totales ? `${totales.paisanos} paisanos en EE. UU.` : "contando…"} />
        <Kpi n={vecinos.length ? `${Math.round((activos / vecinos.length) * 100)}%` : "—"} t="Activos esta semana" s={`${activos} de ${vecinos.length} cargados`} />
        <Kpi n={compradores.length} t="Compraron boletos" s={`${pesos(compradores.reduce((s, v) => s + (v.resumen?.gasto ?? 0), 0))} · de los cargados`} />
        <Kpi n={vecinos.length ? `${Math.round((vecinos.filter((v) => v.notificaciones).length / vecinos.length) * 100)}%` : "—"} t="Con notificaciones" s="les llegan los avisos" />
      </div>

      <div className="row">
        <div className="card grow col" style={{ gap: 0, paddingBottom: 8 }}>
          <div className="row" style={{ gap: 8, paddingBottom: 12, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: "1 1 220px" }} placeholder="Buscar nombre, teléfono o ciudad" aria-label="Buscar vecino" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            <select className="select" style={{ width: 200 }} value={colonia} aria-label="Zona o colonia" onChange={(e) => setColonia(e.target.value)}>
              <option value="">Todas las zonas</option>
              {zonas().map((z) => (
                <optgroup key={z} label={z}>
                  <option value={`zona:${z}`}>Toda la zona</option>
                  {coloniasDeZona(z).map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                </optgroup>
              ))}
            </select>
            <select className="select" style={{ width: 150 }} value={tipo} aria-label="Tipo" onChange={(e) => setTipo(e.target.value)}>
              <option value="">Locales y paisanos</option><option value="local">Locales</option><option value="paisano">Paisanos</option>
            </select>
            <select className="select" style={{ width: 170 }} value={compro} aria-label="Boletos" onChange={(e) => setCompro(e.target.value)}>
              <option value="">Con y sin boletos</option><option value="si">Compraron boletos</option><option value="no">No han comprado</option>
            </select>
            <select className="select" style={{ width: 170 }} value={calif} aria-label="Calificación" onChange={(e) => setCalif(e.target.value)}>
              <option value="">Cualquier calificación</option><option value="alta">4 – 5 estrellas</option><option value="baja">1 – 2 estrellas</option><option value="sin">Sin calificar</option>
            </select>
            <button className="btn ghost" type="button" onClick={exportar} disabled={!visibles.length}>Exportar {visibles.length}</button>
            <button className="btn primary" type="button" onClick={() => setAvisando(true)}>Avisar a este grupo</button>
          </div>
          <table className="tabla">
            <thead><tr><th>VECINO</th><th>COLONIA</th><th>TIPO</th><th>REGISTRO</th><th>ÚLTIMA VEZ</th><th>CALIFICÓ</th><th className="num">BOLETOS</th></tr></thead>
            <tbody>
              {visibles.slice(0, mostrar).map((v) => (
                <tr key={v.id} className={`click${sel?.id === v.id ? " sel" : ""}`} onClick={() => setSel(v)}>
                  <td><div className="row" style={{ gap: 10, alignItems: "center" }}>
                    <span className="avatar">{v.nombre[0]}</span>
                    <div><strong>{v.nombre}</strong><div className="muted" style={{ fontSize: 11 }}>{v.telefono} · {v.plataforma}</div></div>
                  </div></td>
                  <td>{v.colonia || "—"}</td>
                  <td>{v.tipo === "paisano" ? <span className="tag azul">✈ {v.origen}</span> : <span className="tag gris">Local</span>}</td>
                  <td className="muted">{f(v.registradoEn).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit" })}</td>
                  <td className="muted">{haceTexto(v.ultimaVez)}</td>
                  <td>{v.resumen?.estrellas ? <span className="stars">{estrellas(v.resumen.estrellas)}</span> : <span className="muted">—</span>}</td>
                  <td className="num">{v.resumen?.boletos ? <><strong>{v.resumen.boletos}</strong><div className="muted" style={{ fontSize: 11 }}>{pesos(v.resumen.gasto)}</div></> : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              {visibles.length ? `${Math.min(mostrar, visibles.length)} de ${visibles.length} con estos filtros · ${vecinos.length} cargados${totales ? ` de ${totales.todos}` : ""}` : cargando ? "Cargando…" : "Nadie coincide con los filtros."}
            </span>
            <div className="row" style={{ gap: 6 }}>
              {mostrar < visibles.length && <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" onClick={() => setMostrar((n) => n + 25)}>Ver más</button>}
              {hayMas && <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" disabled={cargando} onClick={() => masVecinos(cursor)}>{cargando ? "Cargando…" : "Cargar 200 más"}</button>}
            </div>
          </div>
        </div>

        <div className="card col" style={{ gap: 14, width: 360, flex: "0 0 360px" }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Vecinos por colonia</h3>
            <span className="muted" style={{ fontSize: 12 }}>{cfg().vecinosPorColonia ? "Todo el municipio" : "De los vecinos cargados"}</span>
          </div>
          <Barras datos={porColonia} formato={(n) => String(n)} titulo="Vecinos por colonia" />
        </div>
      </div>

      {sel && <Ficha v={sel} onCerrar={() => setSel(null)} />}
      {avisando && <AvisoSegmento segmento={segmento} onCerrar={() => setAvisando(false)} />}
    </>
  );
}

function AvisoSegmento({ segmento, onCerrar }: { segmento: Segmento; onCerrar: () => void }) {
  const { sesion } = useAuth();
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [evento, setEvento] = useState("");
  const [listo, setListo] = useState(false);
  useEffect(() => { if (segmento.compradoresDe) listarEventos().then((l) => setEventos(l.filter((e) => e.zonas.length))); }, [segmento.compradoresDe]);
  const seg: Segmento = segmento.compradoresDe ? { ...segmento, compradoresDe: evento || "cualquier-evento", descripcion: evento ? `${segmento.descripcion} · ${eventos.find((e) => e.id === evento)?.titulo}` : segmento.descripcion } : segmento;

  return (
    <Modal titulo="Avisar a este grupo" onCerrar={onCerrar} ancho={540}>
      <div className="col" style={{ gap: 14 }}>
        <div className="acard flat"><span className="s">Le llega a</span><span className="t" style={{ fontSize: 14 }}>{seg.descripcion}</span></div>
        {segmento.compradoresDe && (
          <div className="field"><label className="section-label">COMPRADORES DE</label>
            <select className="select" value={evento} onChange={(e) => setEvento(e.target.value)}>
              <option value="">Cualquier evento</option>
              {eventos.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}
            </select></div>
        )}
        <div className="field"><label className="section-label">TÍTULO</label><input className="input" value={titulo} maxLength={60} onChange={(e) => setTitulo(e.target.value)} placeholder="Cambio de horario en el palenque" /></div>
        <div className="field"><label className="section-label">MENSAJE</label><textarea className="textarea" value={cuerpo} maxLength={240} onChange={(e) => setCuerpo(e.target.value)} /></div>
        <span className="muted" style={{ fontSize: 12 }}>Se envía como notificación. No se puede deshacer.</span>
        {listo && <div className="banner" style={{ background: "var(--ok-soft)" }}><strong>Aviso en cola de envío.</strong></div>}
        <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
          <button className="btn ghost" type="button" onClick={onCerrar}>{listo ? "Cerrar" : "Cancelar"}</button>
          {!listo && <button className="btn primary" type="button" disabled={!titulo.trim() || !cuerpo.trim()}
            onClick={async () => { await enviarAviso(titulo.trim(), cuerpo.trim(), seg, sesion!.nombre, sesion!.uid); setListo(true); }}>Enviar aviso</button>}
        </div>
      </div>
    </Modal>
  );
}

function Ficha({ v, onCerrar }: { v: Vecino; onCerrar: () => void }) {
  const [d, setD] = useState<{ compras: Pago[]; tramites: Solicitud[]; votos: Voto[]; cal: Calificacion | null; cands: Candidata[] } | null>(null);
  useEffect(() => {
    setD(null);
    Promise.all([pagosDe(v.id!), solicitudesDe(v.id!), votosDe(v.id!), calificacionDe(v.id!), listarCandidatas()])
      .then(([compras, tramites, votos, cal, cands]) => setD({ compras, tramites, votos, cal, cands }));
  }, [v.id]);
  const total = d?.compras.filter((p) => p.estado === "pagado").reduce((s, p) => s + p.monto, 0) ?? 0;

  return (
    <div className="drawer" role="dialog" aria-label={`Ficha de ${v.nombre}`}>
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
        <div className="acard flat"><span className="s">Colonia</span><span className="t">{v.colonia || "—"}</span></div>
        <div className="acard flat"><span className="s">Tipo</span><span className="t">{v.tipo === "paisano" ? `Paisano · ${v.origen}` : "Local"}</span></div>
        <div className="acard flat"><span className="s">Registro</span><span className="t">{f(v.registradoEn).toLocaleDateString("es-MX", { dateStyle: "medium" })}</span></div>
        <div className="acard flat"><span className="s">Última vez</span><span className="t">{haceTexto(v.ultimaVez)}</span></div>
      </div>

      {!d && <span className="muted">Cargando su historial…</span>}
      {d && (
        <>
          <div className="col" style={{ gap: 6 }}>
            <span className="section-label">CALIFICACIÓN DE LA APP</span>
            {d.cal ? (
              <div className="acard">
                <span className="stars">{estrellas(d.cal.estrellas)}</span>
                {d.cal.comentario && <span style={{ fontSize: 13 }}>“{d.cal.comentario}”</span>}
                <span className="s">Versión {d.cal.version} · {haceTexto(d.cal.creadoEn)}</span>
              </div>
            ) : <span className="muted" style={{ fontSize: 13 }}>No ha calificado.</span>}
          </div>

          <div className="col" style={{ gap: 6 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="section-label">COMPRAS Y PAGOS · {d.compras.length}</span>
              <strong style={{ fontSize: 13 }}>{pesos(total)}</strong>
            </div>
            {d.compras.length === 0 && <span className="muted" style={{ fontSize: 13 }}>No ha comprado nada en la app.</span>}
            {[...d.compras].sort((a, b) => +f(b.creadoEn) - +f(a.creadoEn)).map((p) => (
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
            <span className="section-label">TRÁMITES · {d.tramites.length}</span>
            {d.tramites.length === 0 && <span className="muted" style={{ fontSize: 13 }}>No ha hecho trámites desde la app.</span>}
            {d.tramites.map((t) => (
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
            {d.votos.length === 0 && <span className="muted" style={{ fontSize: 13 }}>No ha votado en los certámenes.</span>}
            {d.votos.map((x) => (
              <span key={x.id} style={{ fontSize: 13 }}>Votó en {CERTAMENES[x.certamen]} · <strong>{d.cands.find((c) => c.id === x.candidataId)?.nombre ?? "—"}</strong></span>
            ))}
            <span className="muted" style={{ fontSize: 12 }}>{v.notificaciones ? "Recibe notificaciones" : "Tiene las notificaciones apagadas"}</span>
          </div>
        </>
      )}
    </div>
  );
}

function Calificaciones({ cals, onCambio }: { cals: Calificacion[]; onCambio: () => Promise<void> }) {
  const { sesion } = useAuth();
  const [filtro, setFiltro] = useState(0);
  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const prom = cals.length ? cals.reduce((s, c) => s + c.estrellas, 0) / cals.length : 0;
  const dist = [5, 4, 3, 2, 1].map((e) => ({ etiqueta: `${e} ★`, valor: cals.filter((c) => c.estrellas === e).length, detalle: `${e} estrellas` }));
  const lista = cals.filter((c) => c.comentario && (!filtro || c.estrellas === filtro)).sort((a, b) => +f(b.creadoEn) - +f(a.creadoEn));
  const conApp = alcanceDe(null);

  return (
    <div className="row">
      <div className="col" style={{ width: 360, flex: "0 0 360px", gap: 16 }}>
        <div className="card col" style={{ gap: 6 }}>
          <span className="section-label">CALIFICACIÓN PROMEDIO</span>
          <div className="row" style={{ gap: 10, alignItems: "baseline" }}>
            <span className="big">{prom.toFixed(1)}</span>
            <span className="stars" style={{ fontSize: 18 }}>{estrellas(Math.round(prom))}</span>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>{cals.length} calificaciones{conApp ? ` · ${Math.round((cals.length / conApp) * 100)}% de los vecinos` : ""}</span>
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
        {lista.map((c) => (
          <div key={c.id} className="acard" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div className="row" style={{ gap: 10, alignItems: "center" }}>
                <span className="avatar">{(c.vecinoNombre ?? "V")[0]}</span>
                <div><strong style={{ fontSize: 13 }}>{c.vecinoNombre ?? "Vecino"}</strong>
                  <div className="muted" style={{ fontSize: 11 }}>{c.tipo === "paisano" ? `Paisano · ${c.origen ?? ""}` : c.colonia ?? ""} · v{c.version} · {haceTexto(c.creadoEn)}</div></div>
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
                    await registrar("Respondió calificación", `${c.vecinoNombre ?? "Vecino"} · ${c.estrellas} ★`, "publico", sesion!.nombre);
                    setRespondiendo(null); await onCambio();
                  }}>Publicar respuesta</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
