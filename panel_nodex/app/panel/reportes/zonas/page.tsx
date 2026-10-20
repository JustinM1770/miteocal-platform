"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Mapa, { type Globo } from "@/components/Mapa";
import { Barras, Columnas, Kpi } from "@/components/graficas";
import { cfg } from "@/lib/config";
import { ETIQUETA_REPORTE, listarReportes, registrar, type Reporte, type TipoReporte } from "@/lib/datos";
import { leerCSV } from "@/lib/importar";
import {
  UMBRAL_CRITICA, duracion, enPeriodo, impacto, porColonia, puntosDeCalor, reportesDeCSV, tendenciaSemanal,
  ultimaFecha, variacion, type LecturaExterna, type ResumenColonia,
} from "@/lib/zonas";

/* Zonas críticas y métricas de impacto. Todo sale de los mismos reportes que
   atiende la pestaña «Reportes»; aquí solo se cuentan y se promedian.
   También analiza un CSV externo (p. ej. los datos del reto) sin guardarlo. */

const PERIODOS = [4, 8, 12, 26, 52] as const;
const TIPOS: ("todos" | TipoReporte)[] = ["todos", "bache", "fuga", "drenaje", "basura", "luminaria", "otro"];
const ROJO = "#d93a3a", NARANJA = "#c77700", GRIS = "#6b7280";
const diaMes = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");

export default function Zonas() {
  const { sesion } = useAuth();
  const router = useRouter();
  const [todos, setTodos] = useState<Reporte[] | null>(null);
  const [semanas, setSemanas] = useState<(typeof PERIODOS)[number]>(8);
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("todos");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [sel, setSel] = useState<ResumenColonia | null>(null);
  const [externo, setExterno] = useState<{ nombre: string; lectura: LecturaExterna } | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  useEffect(() => { listarReportes(2000).then(setTodos); }, []);

  const fuente = useMemo(() => externo ? externo.lectura.reportes : todos ?? [], [externo, todos]);
  // Un archivo viejo se cuenta hacia atrás desde su último reporte, no desde hoy
  const hoy = useMemo(() => externo ? ultimaFecha(externo.lectura.reportes) : new Date(), [externo]);
  const delTipo = useMemo(() => fuente.filter((r) => tipo === "todos" || r.tipo === tipo), [fuente, tipo]);
  const periodo = useMemo(() => enPeriodo(delTipo, semanas, hoy), [delTipo, semanas, hoy]);
  const colonias = useMemo(() => porColonia(periodo, cfg().colonias, hoy), [periodo, hoy]);
  const enMapa = useMemo(() => soloPendientes ? periodo.filter((r) => r.estado !== "resuelto") : periodo, [periodo, soloPendientes]);
  const calor = useMemo(() => puntosDeCalor(enMapa, colonias), [enMapa, colonias]);
  const encuadre = useMemo(() => ({ clave: `z-${semanas}-${tipo}-${externo?.nombre ?? "app"}`, puntos: colonias.flatMap((c) => c.punto ? [c.punto] : []) }), [colonias, semanas, tipo, externo]);
  const [enfoque, setEnfoque] = useState<typeof encuadre | undefined>();
  const marcadores = useMemo(() => colonias.filter((c) => c.punto).map((c) => ({
    id: c.colonia, punto: c.punto!, texto: String(soloPendientes ? c.pendientes : c.total),
    color: c.critica ? ROJO : c.recientes > c.previos ? NARANJA : GRIS,
    onClick: () => setSel(c),
  })), [colonias, soloPendientes]);
  const globo = useMemo<Globo | null>(() => sel?.punto ? {
    punto: sel.punto, titulo: sel.colonia,
    lineas: [`${sel.total} reportes · ${sel.pendientes} por atender`, `Lo más reportado: ${ETIQUETA_REPORTE[sel.tipoPrincipal]}`],
  } : null, [sel]);

  if (!todos) return <div className="muted">Calculando zonas críticas…</div>;

  const imp = impacto(periodo, hoy);
  const tendencia = tendenciaSemanal(delTipo, semanas, hoy);
  const ultima = externo ? "la última semana del archivo" : "esta semana";
  const estaSemana = tendencia[tendencia.length - 1].total, pasada = tendencia[tendencia.length - 2]?.total ?? 0;
  const cambio = variacion(estaSemana, pasada);
  const criticas = colonias.filter((c) => c.critica);
  const alAlza = colonias.filter((c) => !c.critica && c.recientes > c.previos && c.recientes >= 2);
  const porTipo = (Object.keys(ETIQUETA_REPORTE) as TipoReporte[])
    .map((t) => ({ etiqueta: ETIQUETA_REPORTE[t], valor: periodo.filter((r) => r.tipo === t).length }))
    .filter((x) => x.valor).sort((a, b) => b.valor - a.valor);

  /** Al cambiar el filtro, el mapa vuelve a encuadrar todas las colonias */
  function limpiar() { setSel(null); setEnfoque(undefined); }

  function enfocar(c: ResumenColonia) {
    setSel(c);
    if (c.punto) setEnfoque({ clave: `c-${c.colonia}-${Date.now()}`, puntos: [c.punto] });
  }

  async function abrirArchivo(a: File | undefined) {
    if (!a) return;
    const lectura = reportesDeCSV(leerCSV(await a.text()));
    if (archivo.current) archivo.current.value = "";
    if (lectura.error) { setErrorArchivo(`${a.name}: ${lectura.error}`); return; }
    setErrorArchivo(null);
    setExterno({ nombre: a.name, lectura });
    setSemanas(52);
    limpiar();
  }

  function exportar() {
    const filas = [["Colonia", "Reportes", "Por atender", "Resueltos", "Últimas 2 semanas", "2 semanas previas", "Desviaciones sobre el promedio", "Crítica", "Lo más reportado"]];
    for (const c of colonias) filas.push([c.colonia, String(c.total), String(c.pendientes), String(c.resueltos), String(c.recientes), String(c.previos), String(c.z), c.critica ? "Sí" : "No", ETIQUETA_REPORTE[c.tipoPrincipal]]);
    const csv = filas.map((r) => r.map((x) => `"${x.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `zonas-criticas-${externo ? "externo-" : ""}${semanas}-semanas.csv`; a.click(); URL.revokeObjectURL(url);
    registrar("Exportó zonas críticas", `${colonias.length} colonias · ${semanas} semanas${externo ? ` · ${externo.nombre}` : ""}`, "interno", sesion!.nombre);
  }

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="seg">
            {PERIODOS.map((n) => <button key={n} type="button" className={semanas === n ? "on azul" : ""} onClick={() => { setSemanas(n); limpiar(); }}>{n} semanas</button>)}
          </div>
          <select className="select" style={{ width: 180 }} value={tipo} aria-label="Tipo de reporte" onChange={(e) => { setTipo(e.target.value as typeof tipo); limpiar(); }}>
            {TIPOS.map((t) => <option key={t} value={t}>{t === "todos" ? "Todos los tipos" : ETIQUETA_REPORTE[t]}</option>)}
          </select>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <input ref={archivo} type="file" accept=".csv,text/csv" hidden onChange={(e) => abrirArchivo(e.target.files?.[0])} />
          {!externo && <button className="btn ghost" type="button" onClick={() => archivo.current?.click()}>Analizar un CSV externo</button>}
          <button className="btn ghost" type="button" onClick={exportar} disabled={!colonias.length}>Exportar por colonia</button>
        </div>
      </div>

      {errorArchivo && (
        <div className="banner warn">
          <span>{errorArchivo}</span>
          <button className="btn ghost" type="button" onClick={() => setErrorArchivo(null)}>Cerrar</button>
        </div>
      )}

      {externo && (
        <div className="banner info">
          <div className="col" style={{ gap: 3 }}>
            <strong>Analizando {externo.nombre}: {externo.lectura.reportes.length} reportes, no los de la app</strong>
            <span className="muted" style={{ fontSize: 12 }}>
              Columnas usadas: {Object.entries(externo.lectura.columnas).map(([k, v]) => `${k} ← ${v}`).join(" · ")}
              {externo.lectura.ignoradas.length > 0 && ` · Sin usar: ${externo.lectura.ignoradas.join(", ")}`}
              {externo.lectura.descartados.length > 0 && ` · ${externo.lectura.descartados.length} renglones sin fecha válida (${externo.lectura.descartados.slice(0, 5).join(", ")}${externo.lectura.descartados.length > 5 ? "…" : ""})`}
              . Solo se lee en tu navegador; no se guarda.
            </span>
          </div>
          <button className="btn ghost" type="button" onClick={() => { setExterno(null); setSemanas(8); limpiar(); }}>Volver a los reportes de la app</button>
        </div>
      )}

      <div className="row" style={{ flexWrap: "wrap" }}>
        <Kpi n={imp.total} t="Reportes en el periodo"
          s={cambio === null ? `${estaSemana} ${ultima}` : `${estaSemana} ${ultima} · ${cambio > 0 ? "▲" : cambio < 0 ? "▼" : "="} ${Math.abs(cambio)}% vs. la pasada`} />
        <Kpi n={imp.atendidos} t="Reportes atendidos" s={`${imp.tasaAtencion}% ya resueltos`} />
        <Kpi n={duracion(imp.respuestaPromedio)} t="Tiempo promedio de respuesta" s={`hasta la primera respuesta · mediana ${duracion(imp.respuestaMediana)}`} />
        <Kpi n={duracion(imp.resolucionPromedio)} t="Tiempo promedio de solución" s="de que llega a que se resuelve" />
        <Kpi n={imp.sinRespuesta48} t="Sin respuesta +48 h" s={imp.sinRespuesta48 ? "vecinos esperando" : "nadie esperando"} onClick={externo ? undefined : () => router.push("/panel/reportes")} />
      </div>

      <div className="row">
        <div className="card grow col" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div className="col" style={{ gap: 2 }}>
              <h3 className="h3">Mapa de calor</h3>
              <span className="muted" style={{ fontSize: 13 }}>Cada reporte suma donde lo tomó el GPS del vecino; sin GPS, en el centro de su colonia. Lo pendiente pesa el doble.</span>
            </div>
            <div className="seg" style={{ flexWrap: "nowrap" }}>
              <button type="button" className={!soloPendientes ? "on azul" : ""} onClick={() => setSoloPendientes(false)}>Todos</button>
              <button type="button" className={soloPendientes ? "on rojo" : ""} onClick={() => setSoloPendientes(true)}>Por atender</button>
            </div>
          </div>
          <Mapa alto={460} zoom={14} calor={calor} marcadores={marcadores} globo={globo} ajustar={enfoque ?? encuadre} />
          <div className="row" style={{ gap: 14, fontSize: 12, flexWrap: "wrap", alignItems: "center" }}>
            <span className="row" style={{ gap: 6, alignItems: "center" }}>
              <span style={{ width: 70, height: 8, borderRadius: 4, background: "linear-gradient(90deg, #ffd666, #f5a524, #e8590c, #c92a2a)" }} />
              Menos → más reportes
            </span>
            <span className="row" style={{ gap: 6, alignItems: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: ROJO }} />Zona crítica</span>
            <span className="row" style={{ gap: 6, alignItems: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: NARANJA }} />Al alza</span>
            <span className="row" style={{ gap: 6, alignItems: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: GRIS }} />Estable o a la baja</span>
          </div>
        </div>

        <div className="card col" style={{ width: 380, flex: "0 0 380px", gap: 12 }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Zonas críticas</h3>
            <span className="muted" style={{ fontSize: 12 }}>
              Colonias con más reportes que el promedio por {UMBRAL_CRITICA} desviación estándar o más, en las últimas {semanas} semanas.
            </span>
          </div>
          {colonias.length === 0 && <span className="muted" style={{ fontSize: 13 }}>No hay reportes en este periodo.</span>}
          {criticas.length === 0 && colonias.length > 0 && <span className="tag verde">Ninguna colonia se dispara sobre las demás</span>}
          {criticas.map((c) => <TarjetaColonia key={c.colonia} c={c} on={sel?.colonia === c.colonia} onClick={() => enfocar(c)} />)}
          {alAlza.length > 0 && (
            <>
              <span className="section-label" style={{ paddingTop: 4 }}>AL ALZA</span>
              {alAlza.slice(0, 4).map((c) => <TarjetaColonia key={c.colonia} c={c} on={sel?.colonia === c.colonia} onClick={() => enfocar(c)} />)}
            </>
          )}
        </div>
      </div>

      <div className="row">
        <div className="card grow col" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 className="h3">Tendencia por semana</h3>
            <span className="muted" style={{ fontSize: 12 }}>Reportes recibidos, de lunes a domingo</span>
          </div>
          <Columnas titulo="Reportes por semana" alto={180}
            datos={tendencia.map((s) => ({ etiqueta: diaMes(s.inicio), valor: s.total, detalle: `Semana del ${diaMes(s.inicio)} · ${s.resueltos} resueltos` }))} />
        </div>
        <div className="card col" style={{ width: 400, flex: "0 0 400px", gap: 12 }}>
          <h3 className="h3">Por tipo de reporte</h3>
          {porTipo.length ? <Barras titulo="Reportes por tipo" datos={porTipo} /> : <span className="muted" style={{ fontSize: 13 }}>Sin reportes.</span>}
        </div>
      </div>

      <div className="card col" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 className="h3">Colonias más afectadas</h3>
          <span className="muted" style={{ fontSize: 12 }}>Las 10 con más reportes en el periodo</span>
        </div>
        {colonias.length ? (
          <Barras titulo="Colonias con más reportes"
            datos={colonias.slice(0, 10).map((c) => ({ etiqueta: c.colonia, valor: c.total, detalle: `${c.colonia} · ${c.pendientes} por atender · sobre todo ${ETIQUETA_REPORTE[c.tipoPrincipal].toLowerCase()}` }))} />
        ) : <span className="muted" style={{ fontSize: 13 }}>Sin reportes.</span>}
      </div>
    </>
  );
}

function TarjetaColonia({ c, on, onClick }: { c: ResumenColonia; on: boolean; onClick: () => void }) {
  const cambio = variacion(c.recientes, c.previos);
  return (
    <button type="button" className="acard" onClick={onClick}
      style={{ textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer", borderColor: on ? "var(--brand)" : undefined }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span className="t">{c.colonia}</span>
        <span className="muted" style={{ fontSize: 11 }}>{c.total} reportes</span>
      </div>
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {c.critica && <span className="tag rojo">Zona crítica</span>}
        {c.pendientes > 0 && <span className="tag naranja">{c.pendientes} por atender</span>}
        <span className="tag gris">{ETIQUETA_REPORTE[c.tipoPrincipal]}</span>
      </div>
      <span className="s">
        Últimas 2 semanas: {c.recientes} · antes: {c.previos}
        {cambio !== null && ` (${cambio > 0 ? "+" : ""}${cambio}%)`}
      </span>
      <span className="link">Ver en el mapa ›</span>
    </button>
  );
}
