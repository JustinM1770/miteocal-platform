"use client";

import { useEffect, useMemo, useState } from "react";
import { Barras, Kpi } from "@/components/graficas";
import { f, pesos } from "@/lib/almacen";
import { listarVecinos, type Vecino } from "@/lib/vecinos";
import { CONCEPTOS, listarPagos, METODOS, type Concepto, type MetodoPago, type Pago } from "@/lib/feria";

export default function Pagos() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [concepto, setConcepto] = useState<Concepto | "">("");
  const [metodo, setMetodo] = useState<MetodoPago | "">("");

  useEffect(() => { Promise.all([listarPagos(), listarVecinos()]).then(([p, v]) => { setPagos(p); setVecinos(v); }); }, []);
  const vecinoDe = useMemo(() => new Map(vecinos.map((v) => [v.id, v])), [vecinos]);

  const enLinea = pagos.filter((p) => p.canal === "app");
  const visibles = enLinea.filter((p) => (!concepto || p.concepto === concepto) && (!metodo || p.metodo === metodo));
  const cobrado = (l: Pago[]) => l.filter((p) => p.estado === "pagado").reduce((s, p) => s + p.monto, 0);
  const desdeEU = enLinea.filter((p) => vecinoDe.get(p.vecinoId ?? undefined)?.tipo === "paisano");

  const porConcepto = (Object.keys(CONCEPTOS) as Concepto[]).map((c) => ({
    etiqueta: CONCEPTOS[c], valor: cobrado(enLinea.filter((p) => p.concepto === c)),
    detalle: `${enLinea.filter((p) => p.concepto === c).length} pagos`,
  })).sort((a, b) => b.valor - a.valor);

  return (
    <>
      <div className="banner info">
        <span><strong>Pagos simulados.</strong> <span className="muted">El flujo, los folios y los reportes ya funcionan; falta conectar la pasarela (tarjeta, OXXO y SPEI).</span></span>
      </div>
      <div className="row">
        <Kpi n={pesos(cobrado(enLinea))} t="Cobrado en la app" s={`${enLinea.length} pagos`} />
        <Kpi n={pesos(cobrado(enLinea.filter((p) => p.concepto !== "boleto")))} t="Pagos municipales" s="Agua, predial y actas" />
        <Kpi n={pesos(cobrado(desdeEU))} t="Pagado desde EE. UU." s={`${desdeEU.length} pagos de paisanos`} />
        <Kpi n={enLinea.filter((p) => p.estado === "pendiente").length} t="Pendientes" s="Fichas de OXXO sin pagar" />
      </div>
      <div className="row">
        <div className="card grow col" style={{ gap: 0, paddingBottom: 8 }}>
          <div className="row" style={{ gap: 10, paddingBottom: 12 }}>
            <select className="select" value={concepto} onChange={(e) => setConcepto(e.target.value as Concepto | "")}>
              <option value="">Todos los conceptos</option>
              {(Object.keys(CONCEPTOS) as Concepto[]).map((c) => <option key={c} value={c}>{CONCEPTOS[c]}</option>)}
            </select>
            <select className="select" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago | "")}>
              <option value="">Todos los métodos</option>
              {(["tarjeta", "oxxo", "spei"] as MetodoPago[]).map((m) => <option key={m} value={m}>{METODOS[m]}</option>)}
            </select>
          </div>
          <table className="tabla">
            <thead><tr><th>FOLIO</th><th>VECINO</th><th>CONCEPTO</th><th className="num">MONTO</th><th>MÉTODO</th><th>FECHA</th><th>ESTADO</th></tr></thead>
            <tbody>
              {visibles.slice(0, 60).map((p) => {
                const v = vecinoDe.get(p.vecinoId ?? undefined);
                return (
                  <tr key={p.id}>
                    <td><strong>{p.folio}</strong></td>
                    <td>{v?.nombre}<div className="muted" style={{ fontSize: 11 }}>{v?.tipo === "paisano" ? `✈ ${v.origen}` : v?.colonia}</div></td>
                    <td>{p.descripcion}<div className="muted" style={{ fontSize: 11 }}>{CONCEPTOS[p.concepto]}</div></td>
                    <td className="num">{pesos(p.monto)}</td>
                    <td className="muted">{METODOS[p.metodo]}</td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{f(p.creadoEn).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</td>
                    <td><span className={`tag ${p.estado === "pagado" ? "verde" : p.estado === "pendiente" ? "naranja" : "gris"}`}>{p.estado === "pagado" ? "Pagado" : p.estado === "pendiente" ? "Pendiente" : "Reembolsado"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visibles.length > 60 && <span className="muted" style={{ fontSize: 12, paddingTop: 8 }}>Mostrando 60 de {visibles.length}.</span>}
        </div>
        <div className="card col" style={{ gap: 14, width: 360, flex: "0 0 360px" }}>
          <h3 className="h3">Por concepto</h3>
          <Barras datos={porConcepto} formato={(n) => pesos(n)} titulo="Cobrado por concepto" />
        </div>
      </div>
    </>
  );
}
