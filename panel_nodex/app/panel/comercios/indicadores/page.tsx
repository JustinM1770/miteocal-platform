"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Barras, Columnas, Kpi } from "@/components/graficas";
import { pesos } from "@/lib/almacen";
import { cfg } from "@/lib/config";
import { registrar } from "@/lib/datos";
import { CATEGORIAS_COMERCIO, estadoLicencia, listarComercios, mesClave, mesesAtras, type Comercio } from "@/lib/comercios";

/* Indicadores del comercio local para el municipio.
   - Padrón, empleos, licencias y demanda en la app: de todos los comercios.
   - Ventas, pedidos y ticket: SOLO de negocios conectados a qboard.mx (es la
     única fuente de ventas reales; el municipio no ve cuánto vende un negocio
     que no está conectado). */

const mesNombre = (m: string) => new Date(`${m}-15T12:00`).toLocaleDateString("es-MX", { month: "short", year: "2-digit" }).replace(".", "");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default function Indicadores() {
  const { sesion } = useAuth();
  const router = useRouter();
  const [lista, setLista] = useState<Comercio[] | null>(null);
  const [giro, setGiro] = useState("Todos");
  useEffect(() => { listarComercios().then(setLista); }, []);

  const meses = mesesAtras(6);
  const mes = mesClave(), anterior = meses[meses.length - 2];
  const activos = useMemo(() => (lista ?? []).filter((c) => c.activo && (giro === "Todos" || c.categoria === giro)), [lista, giro]);
  if (!lista) return <div className="muted">Cargando comercios…</div>;

  const enQboard = activos.filter((c) => c.qboard);
  const m = (c: Comercio, k: string) => c.metricas?.[k];
  const ventasMes = enQboard.reduce((s, c) => s + (m(c, mes)?.ventas ?? 0), 0);
  const ventasAnt = enQboard.reduce((s, c) => s + (m(c, anterior)?.ventas ?? 0), 0);
  const crecimiento = ventasAnt ? Math.round(((ventasMes - ventasAnt) / ventasAnt) * 100) : 0;
  const empleos = activos.reduce((s, c) => s + (c.empleados ?? 0), 0);
  const licencias = activos.map((c) => ({ c, e: estadoLicencia(c) }));
  const atender = licencias.filter((x) => x.e !== "vigente");
  const contactosMes = activos.reduce((s, c) => s + (m(c, mes)?.contactos ?? 0), 0);

  const porMes = meses.map((k) => ({ etiqueta: mesNombre(k), valor: enQboard.reduce((s, c) => s + (m(c, k)?.ventas ?? 0), 0), detalle: `Ventas en qboard.mx · ${mesNombre(k)}` }));
  const porGiro = CATEGORIAS_COMERCIO.map((g) => ({ etiqueta: g, valor: activos.filter((c) => c.categoria === g).length, detalle: `${activos.filter((c) => c.categoria === g && c.qboard).length} en qboard.mx` })).filter((x) => x.valor).sort((a, b) => b.valor - a.valor);
  const colonias = [...new Set(activos.map((c) => c.colonia).filter(Boolean))] as string[];
  const porColonia = colonias.map((k) => ({ etiqueta: k, valor: activos.filter((c) => c.colonia === k).length })).sort((a, b) => b.valor - a.valor).slice(0, 8);

  const ranking = [...enQboard].map((c) => {
    const v = m(c, mes)?.ventas ?? 0, a = m(c, anterior)?.ventas ?? 0, p = m(c, mes)?.pedidos ?? 0;
    return { c, ventas: v, pedidos: p, ticket: p ? v / p : 0, crece: a ? Math.round(((v - a) / a) * 100) : null, usd: m(c, mes)?.ventasUsd ?? 0 };
  }).sort((a, b) => b.ventas - a.ventas).slice(0, 10);

  const demanda = [...activos].sort((a, b) => (m(b, mes)?.contactos ?? 0) - (m(a, mes)?.contactos ?? 0)).slice(0, 8);
  // Con demanda en la app pero sin venta en línea
  const candidatos = activos.filter((c) => !c.qboard && c.whatsapp).sort((a, b) => (m(b, mes)?.contactos ?? 0) - (m(a, mes)?.contactos ?? 0)).slice(0, 6);
  const promContactos = (l: Comercio[]) => (l.length ? Math.round(l.reduce((s, c) => s + (m(c, mes)?.contactos ?? 0), 0) / l.length) : 0);
  const sinQboard = activos.filter((c) => !c.qboard);

  const whatsapp = (c: Comercio, texto: string) => `https://wa.me/${c.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;

  function exportar() {
    const filas = [["Comercio", "Giro", "Colonia", "Empleados", "Formal", "Licencia", "Vence", "qboard.mx", `Ventas ${mes}`, `Pedidos ${mes}`, `Contactos app ${mes}`]];
    for (const { c, e } of licencias) filas.push([c.nombre, c.categoria, c.colonia ?? "", String(c.empleados ?? ""), c.formal ? "Sí" : "No", e, c.licencia?.vence ?? "", c.qboard ? "Sí" : "No", String(m(c, mes)?.ventas ?? ""), String(m(c, mes)?.pedidos ?? ""), String(m(c, mes)?.contactos ?? 0)]);
    const csv = filas.map((r) => r.map((x) => `"${x.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `comercios-${mes}.csv`; a.click(); URL.revokeObjectURL(url);
    registrar("Exportó indicadores de comercio", `${licencias.length} comercios`, "interno", sesion!.nombre);
  }

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="seg">
          {["Todos", ...CATEGORIAS_COMERCIO].map((g) => <button key={g} type="button" className={giro === g ? "on azul" : ""} onClick={() => setGiro(g)}>{g}</button>)}
        </div>
        <button className="btn ghost" type="button" onClick={exportar}>Exportar padrón</button>
      </div>

      <div className="row">
        <Kpi n={activos.length} t="Comercios en el padrón" s={`${pct(activos.filter((c) => c.formal).length, activos.length)}% formalizados (RFC)`} onClick={() => router.push("/panel/comercios")} />
        <Kpi n={empleos.toLocaleString("es-MX")} t="Empleos que generan" s={`${activos.length ? (empleos / activos.length).toFixed(1) : 0} por negocio`} />
        <Kpi n={`${enQboard.length} · ${pct(enQboard.length, activos.length)}%`} t="Venden en línea con qboard.mx" s={`${sinQboard.length} todavía no`} />
        <Kpi n={pesos(ventasMes)} t="Ventas del mes en qboard.mx" s={ventasAnt ? `${crecimiento >= 0 ? "+" : ""}${crecimiento}% vs mes anterior` : "primer mes"} />
        <Kpi n={atender.length} t="Licencias por atender" s={`${licencias.filter((x) => x.e === "vencida").length} vencidas · ${licencias.filter((x) => x.e === "sin-licencia").length} sin licencia`} />
      </div>

      <div className="row">
        <div className="card grow col" style={{ gap: 14 }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Ventas en línea del comercio local</h3>
            <span className="muted" style={{ fontSize: 12 }}>Negocios conectados a qboard.mx · últimos 6 meses</span>
          </div>
          <Columnas datos={porMes} formato={(n) => pesos(n)} alto={170} titulo="Ventas mensuales en qboard.mx" />
        </div>
        <div className="card col" style={{ gap: 14, width: 380, flex: "0 0 380px" }}>
          <h3 className="h3">Comercios por giro</h3>
          <Barras datos={porGiro} formato={(n) => String(n)} titulo="Comercios por giro" />
        </div>
      </div>

      <div className="card col" style={{ gap: 0, paddingBottom: 8 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", paddingBottom: 12 }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Quién vende más</h3>
            <span className="muted" style={{ fontSize: 12 }}>{mesNombre(mes)} · solo negocios en qboard.mx (es donde se registran las ventas)</span>
          </div>
        </div>
        {ranking.length === 0 ? <span className="muted" style={{ paddingBottom: 12 }}>Ningún comercio de este giro vende todavía en qboard.mx.</span> : (
          <table className="tabla">
            <thead><tr><th>#</th><th>COMERCIO</th><th>COLONIA</th><th className="num">VENTAS</th><th className="num">PEDIDOS</th><th className="num">TICKET PROM.</th><th className="num">VS MES ANT.</th><th className="num">DESDE EE. UU.</th></tr></thead>
            <tbody>
              {ranking.map((x, i) => (
                <tr key={x.c.id}>
                  <td className="muted" style={{ width: 28 }}>{i + 1}</td>
                  <td><strong>{x.c.nombre}</strong><div className="muted" style={{ fontSize: 11 }}>{x.c.categoria}</div></td>
                  <td className="muted">{x.c.colonia}</td>
                  <td className="num"><strong>{pesos(x.ventas)}</strong></td>
                  <td className="num">{x.pedidos}</td>
                  <td className="num">{pesos(x.ticket)}</td>
                  <td className="num" style={{ color: x.crece === null ? undefined : x.crece >= 0 ? "var(--ok)" : "var(--danger)" }}>{x.crece === null ? "—" : `${x.crece >= 0 ? "+" : ""}${x.crece}%`}</td>
                  <td className="num">{x.usd ? `US$${x.usd.toLocaleString("es-MX")}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="row">
        <div className="card grow col" style={{ gap: 0, paddingBottom: 8 }}>
          <div className="col" style={{ gap: 2, paddingBottom: 12 }}>
            <h3 className="h3">Lo que más buscan los vecinos</h3>
            <span className="muted" style={{ fontSize: 12 }}>Contactos por WhatsApp desde la app · {mesNombre(mes)} · {contactosMes.toLocaleString("es-MX")} en total</span>
          </div>
          <table className="tabla">
            <thead><tr><th>COMERCIO</th><th>GIRO</th><th className="num">CONTACTOS</th><th className="num">VISITAS</th><th>EN LÍNEA</th></tr></thead>
            <tbody>
              {demanda.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.nombre}</strong></td>
                  <td className="muted">{c.categoria}</td>
                  <td className="num">{m(c, mes)?.contactos ?? 0}</td>
                  <td className="num">{m(c, mes)?.visitas ?? 0}</td>
                  <td>{c.qboard ? <span className="tag azul">qboard.mx</span> : <span className="tag gris">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card col" style={{ gap: 14, width: 380, flex: "0 0 380px" }}>
          <h3 className="h3">Comercios por colonia</h3>
          <Barras datos={porColonia} formato={(n) => String(n)} titulo="Comercios por colonia" />
        </div>
      </div>

      <div className="row">
        <div className="card grow col" style={{ gap: 10 }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Podrían vender en línea</h3>
            <span className="muted" style={{ fontSize: 12 }}>
              Negocios con demanda en la app que aún no venden en qboard.mx. Los conectados reciben en promedio {promContactos(enQboard)} contactos al mes; los demás, {promContactos(sinQboard)}.
            </span>
          </div>
          {candidatos.length === 0 && <span className="muted">Todos los negocios con WhatsApp ya venden en línea.</span>}
          {candidatos.map((c) => (
            <div key={c.id} className="list-row">
              <div className="col grow" style={{ gap: 1 }}><strong style={{ fontSize: 13 }}>{c.nombre}</strong><span className="muted" style={{ fontSize: 12 }}>{c.categoria} · {c.colonia} · {m(c, mes)?.contactos ?? 0} contactos este mes</span></div>
              <a className="btn ghost" style={{ padding: "6px 10px" }} target="_blank" rel="noreferrer"
                href={whatsapp(c, `Hola, ${c.nombre}. Este mes ${m(c, mes)?.contactos ?? 0} vecinos los buscaron en la app del municipio. Con qboard.mx pueden recibir pedidos y pagos en línea. ¿Les interesa?`)}>
                Invitar por WhatsApp
              </a>
            </div>
          ))}
        </div>

        <div className="card col" style={{ gap: 10, width: 440, flex: "0 0 440px" }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Licencias de funcionamiento</h3>
            <span className="muted" style={{ fontSize: 12 }}>Para Tesorería: vencidas, por vencer (30 días) y sin licencia.</span>
          </div>
          {atender.length === 0 && <span className="muted">Todas las licencias están vigentes.</span>}
          {atender.sort((a, b) => ["vencida", "sin-licencia", "por-vencer"].indexOf(a.e) - ["vencida", "sin-licencia", "por-vencer"].indexOf(b.e)).slice(0, 8).map(({ c, e }) => (
            <div key={c.id} className="list-row" style={{ gap: 10 }}>
              <div className="col grow" style={{ gap: 1 }}>
                <strong style={{ fontSize: 13 }}>{c.nombre}</strong>
                <span className="muted" style={{ fontSize: 11 }}>{c.licencia ? `${c.licencia.numero} · vence ${new Date(`${c.licencia.vence}T12:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}` : "No tiene licencia registrada"}</span>
              </div>
              <span className={`tag ${e === "vencida" ? "rojo" : e === "sin-licencia" ? "gris" : "naranja"}`}>{e === "vencida" ? "Vencida" : e === "sin-licencia" ? "Sin licencia" : "Por vencer"}</span>
              {c.whatsapp && (
                <a className="btn ghost" style={{ padding: "4px 8px", fontSize: 12 }} target="_blank" rel="noreferrer" aria-label={`Recordar a ${c.nombre}`}
                  href={whatsapp(c, `Hola, ${c.nombre}. Le recordamos que su licencia de funcionamiento ${e === "vencida" ? "está vencida" : e === "sin-licencia" ? "no está registrada" : "vence pronto"}. Puede hacer el trámite en la app ${cfg().nombre ? `de ${cfg().nombre}` : "del municipio"} → Trámites.`)}>
                  Recordar
                </a>
              )}
            </div>
          ))}
          {atender.length > 8 && <span className="muted" style={{ fontSize: 12 }}>Y {atender.length - 8} más · exporta el padrón para verlos todos.</span>}
        </div>
      </div>

      <span className="muted" style={{ fontSize: 11 }}>
        Las ventas provienen de la integración con qboard.mx y solo existen para los negocios conectados. Los contactos y visitas los registra la app. Los demás datos los captura el municipio.
      </span>
    </>
  );
}
