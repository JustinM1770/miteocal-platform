"use client";

import { useCallback, useEffect, useState } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { Barras, Kpi } from "@/components/graficas";
import { f, pesos } from "@/lib/almacen";
import { CONCEPTOS, METODOS, paginaPagos, totalesPagos, type Concepto, type MetodoPago, type Pago } from "@/lib/feria";

type Totales = Awaited<ReturnType<typeof totalesPagos>>;

export default function Pagos() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [concepto, setConcepto] = useState<Concepto | "">("");
  const [metodo, setMetodo] = useState<MetodoPago | "">("");

  // Los filtros van al servidor: la página trae solo lo que coincide
  const filtros: [string, unknown][] = [["canal", "app"], ...(concepto ? [["concepto", concepto] as [string, unknown]] : []), ...(metodo ? [["metodo", metodo] as [string, unknown]] : [])];
  const clave = JSON.stringify(filtros);

  const cargar = useCallback(async (desde: QueryDocumentSnapshot<DocumentData> | null) => {
    setCargando(true);
    const p = await paginaPagos(desde, JSON.parse(clave));
    setPagos((l) => (desde ? [...l, ...p.items] : p.items));
    setCursor(p.cursor); setHayMas(p.hayMas); setCargando(false);
  }, [clave]);

  useEffect(() => { cargar(null); }, [cargar]);
  useEffect(() => { totalesPagos().then(setTotales); }, []);

  const porConcepto = totales
    ? (Object.keys(CONCEPTOS) as Concepto[]).map((c) => ({ etiqueta: CONCEPTOS[c], valor: totales.conceptos[c].monto, detalle: `${totales.conceptos[c].n} pagos` })).sort((a, b) => b.valor - a.valor)
    : [];

  return (
    <>
      <div className="banner info">
        <span><strong>Pagos simulados.</strong> <span className="muted">El flujo, los folios y los reportes ya funcionan; falta conectar la pasarela (tarjeta, OXXO y SPEI).</span></span>
      </div>
      <div className="row">
        <Kpi n={totales ? pesos(totales.enApp.monto) : "…"} t="Cobrado en la app" s={totales ? `${totales.enApp.n} pagos` : ""} />
        <Kpi n={totales ? pesos(totales.municipales.monto) : "…"} t="Pagos municipales" s="Agua, predial y actas" />
        <Kpi n={totales ? pesos(totales.eu.monto) : "…"} t="Pagado desde EE. UU." s={totales ? `${totales.eu.n} pagos de paisanos` : ""} />
        <Kpi n={totales?.pendientes.n ?? "…"} t="Pendientes" s="Fichas de OXXO sin pagar" />
      </div>
      <div className="row">
        <div className="card grow col" style={{ gap: 0, paddingBottom: 8 }}>
          <div className="row" style={{ gap: 10, paddingBottom: 12 }}>
            <select className="select" value={concepto} aria-label="Concepto" onChange={(e) => setConcepto(e.target.value as Concepto | "")}>
              <option value="">Todos los conceptos</option>
              {(Object.keys(CONCEPTOS) as Concepto[]).map((c) => <option key={c} value={c}>{CONCEPTOS[c]}</option>)}
            </select>
            <select className="select" value={metodo} aria-label="Método" onChange={(e) => setMetodo(e.target.value as MetodoPago | "")}>
              <option value="">Todos los métodos</option>
              {(["tarjeta", "oxxo", "spei"] as MetodoPago[]).map((m) => <option key={m} value={m}>{METODOS[m]}</option>)}
            </select>
          </div>
          <table className="tabla">
            <thead><tr><th>FOLIO</th><th>VECINO</th><th>CONCEPTO</th><th className="num">MONTO</th><th>MÉTODO</th><th>FECHA</th><th>ESTADO</th></tr></thead>
            <tbody>
              {pagos.length === 0 && !cargando && <tr><td colSpan={7} className="muted">No hay pagos con estos filtros.</td></tr>}
              {pagos.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.folio}</strong></td>
                  <td>{p.compradorNombre ?? "Vecino"}<div className="muted" style={{ fontSize: 11 }}>{p.compradorTipo === "paisano" ? `✈ ${p.compradorOrigen ?? ""}` : p.compradorColonia}</div></td>
                  <td>{p.descripcion}<div className="muted" style={{ fontSize: 11 }}>{CONCEPTOS[p.concepto]}</div></td>
                  <td className="num">{pesos(p.monto)}</td>
                  <td className="muted">{METODOS[p.metodo]}</td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{f(p.creadoEn).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</td>
                  <td><span className={`tag ${p.estado === "pagado" ? "verde" : p.estado === "pendiente" ? "naranja" : "gris"}`}>{p.estado === "pagado" ? "Pagado" : p.estado === "pendiente" ? "Pendiente" : "Reembolsado"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
            <span className="muted" style={{ fontSize: 12 }}>{cargando ? "Cargando…" : `${pagos.length} pagos cargados`}</span>
            {hayMas && <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" disabled={cargando} onClick={() => cargar(cursor)}>Cargar más</button>}
          </div>
        </div>
        <div className="card col" style={{ gap: 14, width: 360, flex: "0 0 360px" }}>
          <h3 className="h3">Por concepto</h3>
          <Barras datos={porConcepto} formato={(n) => pesos(n)} titulo="Cobrado por concepto" />
        </div>
      </div>
    </>
  );
}
