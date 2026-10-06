"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Barras, Columnas, Kpi } from "@/components/graficas";
import { listarVecinos, type Vecino } from "@/lib/vecinos";
import {
  CATEGORIAS, FERIA, listarEventos, listarRegistrosPaisanos, type Evento, type RegistroPaisano,
} from "@/lib/feria";

export default function HijosAusentes() {
  const router = useRouter();
  const [regs, setRegs] = useState<RegistroPaisano[]>([]);
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    Promise.all([listarRegistrosPaisanos(), listarVecinos(), listarEventos()])
      .then(([r, v, e]) => { setRegs(r); setVecinos(v); setEventos(e); });
  }, []);

  const paisanosApp = vecinos.filter((v) => v.tipo === "paisano");
  const personas = regs.reduce((s, r) => s + r.personas, 0);
  const desfile = regs.filter((r) => r.desfile).reduce((s, r) => s + r.personas, 0);

  const ciudades = [...new Set(regs.map((r) => r.origen))]
    .map((c) => ({ etiqueta: c, valor: regs.filter((r) => r.origen === c).reduce((s, r) => s + r.personas, 0), detalle: `${regs.filter((r) => r.origen === c).length} familias desde ${c}` }))
    .sort((a, b) => b.valor - a.valor);

  // Desde el inicio de la feria hasta el día del desfile
  const llegadas = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(`${FERIA.inicio}T12:00`); d.setDate(d.getDate() + i);
    const fecha = d.toISOString().slice(0, 10);
    return {
      etiqueta: new Date(`${fecha}T12:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
      valor: regs.filter((r) => r.llega === fecha).reduce((s, r) => s + r.personas, 0),
      detalle: `Llegan el ${new Date(`${fecha}T12:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}`,
    };
  });

  const programa = eventos.filter((e) => e.categoria === "hijos_ausentes" || e.titulo.toLowerCase().includes("ausentes"));
  const q = buscar.trim().toLowerCase();
  const visibles = regs.filter((r) => !q || `${r.nombre} ${r.origen}`.toLowerCase().includes(q));

  return (
    <>
      <div className="row">
        <Kpi n={personas} t="Paisanos que vienen" s={`${regs.length} familias registradas en la app`} />
        <Kpi n={desfile} t="Van al desfile" s="Para calcular vallas y agua" />
        <Kpi n={ciudades.length} t="Ciudades de origen" s={ciudades[0] ? `La mayoría desde ${ciudades[0].etiqueta}` : ""} />
        <Kpi n={paisanosApp.length} t="Paisanos con la app" s="Pueden recibir avisos y ver transmisiones" onClick={() => router.push("/panel/crm")} />
      </div>

      <div className="row">
        <div className="card grow col" style={{ gap: 14 }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Desde dónde vienen</h3>
            <span className="muted" style={{ fontSize: 12 }}>Personas registradas por ciudad</span>
          </div>
          <Barras datos={ciudades} formato={(n) => `${n} personas`} titulo="Personas por ciudad de origen" />
        </div>
        <div className="card col" style={{ gap: 14, width: 420, flex: "0 0 420px" }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Cuándo llegan</h3>
            <span className="muted" style={{ fontSize: 12 }}>Personas por día de llegada a {FERIA.nombre.split(" ")[0]}</span>
          </div>
          <Columnas datos={llegadas} formato={(n) => `${n} personas`} alto={140} titulo="Personas por día de llegada" />
        </div>
      </div>

      <div className="row">
        <div className="card grow col" style={{ gap: 0, paddingBottom: 8 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", paddingBottom: 12, gap: 12 }}>
            <h3 className="h3">Familias registradas</h3>
            <input className="input" style={{ maxWidth: 280 }} placeholder="Buscar por nombre o ciudad" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </div>
          <table className="tabla">
            <thead><tr><th>NOMBRE</th><th>DESDE</th><th>LLEGA</th><th className="num">PERSONAS</th><th>DESFILE</th></tr></thead>
            <tbody>
              {visibles.slice(0, 40).map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.nombre}</strong></td>
                  <td className="muted">{r.origen}</td>
                  <td>{new Date(`${r.llega}T12:00`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td className="num">{r.personas}</td>
                  <td>{r.desfile ? <span className="tag verde">Sí</span> : <span className="tag gris">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibles.length > 40 && <span className="muted" style={{ fontSize: 12, paddingTop: 8 }}>Mostrando 40 de {visibles.length}.</span>}
        </div>

        <div className="col" style={{ width: 380, flex: "0 0 380px", gap: 12 }}>
          <div className="card col" style={{ gap: 10 }}>
            <h3 className="h3">Programa de Hijos Ausentes</h3>
            {programa.map((e) => (
              <div key={e.id} className="acard flat">
                <span className={`tag ${CATEGORIAS[e.categoria].color}`}>{CATEGORIAS[e.categoria].icono} {CATEGORIAS[e.categoria].nombre}</span>
                <span className="t">{e.titulo}</span>
                <span className="s">{new Date(`${e.fecha}T12:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })} · {e.hora} hrs · {e.escenario}</span>
                {e.transmitir && <span className="tag rojo">● Se transmite para quien no pudo venir</span>}
              </div>
            ))}
            <button className="btn ghost" type="button" onClick={() => router.push("/panel/feria/programa")}>Agregar al programa</button>
          </div>
          <div className="card col" style={{ gap: 8 }}>
            <h3 className="h3">Avisar a los paisanos</h3>
            <span className="muted" style={{ fontSize: 13 }}>Trámites a distancia, horarios del desfile o cambios de último momento. Les llega aunque estén en EE. UU.</span>
            <button className="btn primary" type="button" onClick={() => router.push("/panel/paisanos")}>Publicar en Paisanos</button>
          </div>
        </div>
      </div>
    </>
  );
}
