"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Barras, Columnas, Kpi } from "@/components/graficas";
import { pesos, f } from "@/lib/almacen";
import {
  CATEGORIAS, CERTAMENES, listarCandidatas, listarEventos, listarPagos, listarRegistrosPaisanos,
  listarTransmisiones, listarVotos, METODOS, vendidos,
  type Candidata, type Evento, type Pago, type RegistroPaisano, type Transmision, type Voto,
} from "@/lib/feria";

export default function ResumenFeria() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [votos, setVotos] = useState<Voto[]>([]);
  const [cands, setCands] = useState<Candidata[]>([]);
  const [trans, setTrans] = useState<Transmision[]>([]);
  const [regs, setRegs] = useState<RegistroPaisano[]>([]);

  useEffect(() => {
    Promise.all([listarEventos(), listarPagos(), listarVotos(), listarCandidatas(), listarTransmisiones(), listarRegistrosPaisanos()])
      .then(([e, p, v, c, t, r]) => { setEventos(e); setPagos(p); setVotos(v); setCands(c); setTrans(t); setRegs(r); });
  }, []);

  const boletos = pagos.filter((p) => p.concepto === "boleto" && p.estado === "pagado");
  const ingresos = boletos.reduce((s, p) => s + p.monto, 0);
  const piezas = boletos.reduce((s, p) => s + (p.cantidad ?? 0), 0);
  const enApp = boletos.filter((p) => p.canal === "app").reduce((s, p) => s + p.monto, 0);
  const enVivo = trans.filter((t) => t.estado === "en_vivo");

  // Ventas de los últimos 14 días
  const dias = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (13 - i));
    return d;
  });
  const porDia = dias.map((d) => {
    const fin = +d + 86400_000;
    const v = boletos.filter((p) => +f(p.creadoEn) >= +d && +f(p.creadoEn) < fin).reduce((s, p) => s + p.monto, 0);
    return {
      etiqueta: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
      valor: v,
      detalle: d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }),
    };
  });

  const porMetodo = (Object.keys(METODOS) as (keyof typeof METODOS)[]).map((m) => ({
    etiqueta: METODOS[m],
    valor: boletos.filter((p) => p.metodo === m).reduce((s, p) => s + p.monto, 0),
  })).sort((a, b) => b.valor - a.valor);

  const conBoletos = eventos.filter((e) => e.zonas.length);

  return (
    <>
      <div className="row">
        <Kpi n={pesos(ingresos)} t="Venta de boletos" s={`${Math.round((enApp / Math.max(1, ingresos)) * 100)}% desde la app`} onClick={() => router.push("/panel/feria/boletos")} />
        <Kpi n={piezas.toLocaleString("es-MX")} t="Boletos vendidos" s={`${conBoletos.length} eventos con boletaje`} />
        <Kpi n={votos.length.toLocaleString("es-MX")} t="Votos para reinas" s="1 voto por vecino y certamen" onClick={() => router.push("/panel/feria/reinas")} />
        <Kpi n={regs.reduce((s, r) => s + r.personas, 0)} t="Paisanos que vienen" s={`${regs.length} familias registradas`} onClick={() => router.push("/panel/feria/hijos-ausentes")} />
      </div>

      {enVivo.map((t) => (
        <div key={t.id} className="banner" style={{ background: "var(--danger-soft)" }}>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <span className="pill" style={{ background: "var(--danger)", color: "#fff" }}>● EN VIVO</span>
            <strong>{t.titulo}</strong>
            <span className="muted">{t.espectadores} personas viendo</span>
          </div>
          <button className="btn ghost" type="button" onClick={() => router.push("/panel/feria/transmisiones")}>Ver transmisión</button>
        </div>
      ))}

      <div className="row">
        <div className="card grow col" style={{ gap: 14 }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Venta de boletos por día</h3>
            <span className="muted" style={{ fontSize: 12 }}>Últimos 14 días · app y taquilla · solo pagados</span>
          </div>
          <Columnas datos={porDia} formato={(n) => pesos(n)} titulo="Venta de boletos por día" />
        </div>
        <div className="card col" style={{ gap: 14, width: 400, flex: "0 0 400px" }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Cómo pagan</h3>
            <span className="muted" style={{ fontSize: 12 }}>Monto por método de pago</span>
          </div>
          <Barras datos={porMetodo} formato={(n) => pesos(n)} titulo="Monto por método de pago" />
        </div>
      </div>

      <div className="row">
        <div className="card grow col" style={{ gap: 0, paddingBottom: 8 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", paddingBottom: 12 }}>
            <h3 className="h3">Ocupación por evento</h3>
            <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" onClick={() => router.push("/panel/feria/programa")}>Ver programa</button>
          </div>
          <table className="tabla">
            <thead><tr><th>EVENTO</th><th>FECHA</th><th>VENDIDOS</th><th style={{ width: 140 }}>OCUPACIÓN</th><th className="num">INGRESO</th></tr></thead>
            <tbody>
              {conBoletos.map((e) => {
                const cupo = e.zonas.reduce((s, z) => s + z.cupo, 0);
                const v = vendidos(pagos, e.id!);
                const pct = Math.min(100, Math.round((v / cupo) * 100));
                const ing = boletos.filter((p) => p.eventoId === e.id).reduce((s, p) => s + p.monto, 0);
                return (
                  <tr key={e.id}>
                    <td><strong>{e.titulo}</strong><div className="muted" style={{ fontSize: 12 }}>{CATEGORIAS[e.categoria].nombre} · {e.escenario}</div></td>
                    <td className="muted">{new Date(`${e.fecha}T12:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" })} · {e.hora}</td>
                    <td>{v.toLocaleString("es-MX")} / {cupo.toLocaleString("es-MX")}</td>
                    <td><div className={`ocupacion${pct >= 95 ? " lleno" : ""}`}><div style={{ width: `${pct}%` }} /></div><span className="muted" style={{ fontSize: 11 }}>{pct}%</span></td>
                    <td className="num">{pesos(ing)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card col" style={{ gap: 14, width: 400, flex: "0 0 400px" }}>
          <h3 className="h3">Van ganando</h3>
          {(Object.keys(CERTAMENES) as (keyof typeof CERTAMENES)[]).map((c) => {
            const lista = cands.filter((x) => x.certamen === c)
              .map((x) => ({ etiqueta: x.nombre, valor: votos.filter((v) => v.candidataId === x.id).length, detalle: x.representa }))
              .sort((a, b) => b.valor - a.valor);
            return (
              <div key={c} className="col" style={{ gap: 8 }}>
                <span className="section-label">{CERTAMENES[c].toUpperCase()}</span>
                <Barras datos={lista} formato={(n) => `${n} votos`} titulo={`Votos ${CERTAMENES[c]}`} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
