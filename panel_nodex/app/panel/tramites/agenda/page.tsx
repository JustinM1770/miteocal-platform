"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { f } from "@/lib/almacen";
import {
  DEPENDENCIAS, ESTADOS, guardarAgenda, listarAgendas, listarSolicitudes, turnos,
  type Agenda, type Dependencia, type Solicitud,
} from "@/lib/tramites";

const DIAS = [{ n: 1, l: "L" }, { n: 2, l: "M" }, { n: 3, l: "X" }, { n: 4, l: "J" }, { n: 5, l: "V" }, { n: 6, l: "S" }, { n: 0, l: "D" }];
const hora = (d: Date) => d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

export default function AgendaCitas() {
  const { sesion } = useAuth();
  const miArea = sesion?.rol !== "admin" && (DEPENDENCIAS as readonly string[]).includes(sesion?.area ?? "") ? (sesion!.area as Dependencia) : null;
  const [dep, setDep] = useState<Dependencia>(miArea ?? "Registro Civil");
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [sols, setSols] = useState<Solicitud[]>([]);
  const [dia, setDia] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [ag, setAg] = useState<Agenda | null>(null);
  const [inhabil, setInhabil] = useState("");
  const [guardado, setGuardado] = useState(false);

  const cargar = useCallback(async () => {
    const [a, s] = await Promise.all([listarAgendas(), listarSolicitudes()]);
    setAgendas(a); setSols(s);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { const x = agendas.find((a) => a.dependencia === dep); if (x) setAg({ ...x, dias: [...x.dias], inhabiles: [...x.inhabiles] }); setGuardado(false); }, [agendas, dep]);

  if (!ag) return <div className="muted">Cargando agenda…</div>;
  const poner = (c: Partial<Agenda>) => { setAg({ ...ag, ...c }); setGuardado(false); };

  const fecha = new Date(`${dia}T12:00`);
  const slots = turnos(ag, fecha);
  const citas = sols.filter((s) => s.dependencia === dep && s.cita && f(s.cita).toLocaleDateString("en-CA") === dia);
  const enSlot = (d: Date) => citas.filter((s) => Math.abs(+f(s.cita) - +d) < ag.minutos * 60000 && +f(s.cita) >= +d);
  const capacidad = slots.length * ag.ventanillas;

  return (
    <>
      {!miArea && (
        <div className="seg">
          {DEPENDENCIAS.map((d) => <button key={d} type="button" className={dep === d ? "on azul" : ""} onClick={() => setDep(d)}>{d}</button>)}
        </div>
      )}
      <div className="row">
        <div className="card col" style={{ gap: 16, width: 380, flex: "0 0 380px" }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Horario de atención · {dep}</h3>
            <span className="muted" style={{ fontSize: 12 }}>Con esto la app ofrece los horarios libres al vecino.</span>
          </div>
          <div className="field"><label className="section-label">DÍAS QUE ATIENDE</label>
            <div className="dias">{DIAS.map((d) => (
              <button key={d.n} type="button" className={`dia${ag.dias.includes(d.n) ? " on" : ""}`} aria-pressed={ag.dias.includes(d.n)}
                onClick={() => poner({ dias: ag.dias.includes(d.n) ? ag.dias.filter((x) => x !== d.n) : [...ag.dias, d.n] })}>{d.l}</button>
            ))}</div></div>
          <div className="row" style={{ gap: 10 }}>
            <div className="field grow"><label className="section-label">ABRE</label><input className="input" type="time" value={ag.inicio} onChange={(e) => poner({ inicio: e.target.value })} /></div>
            <div className="field grow"><label className="section-label">CIERRA</label><input className="input" type="time" value={ag.fin} onChange={(e) => poner({ fin: e.target.value })} /></div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <div className="field grow"><label className="section-label">MINUTOS POR CITA</label>
              <select className="select" value={ag.minutos} onChange={(e) => poner({ minutos: +e.target.value })}>
                {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select></div>
            <div className="field grow"><label className="section-label">VENTANILLAS</label>
              <input className="input" type="number" min={1} max={10} value={ag.ventanillas} onChange={(e) => poner({ ventanillas: Math.max(1, +e.target.value) })} /></div>
          </div>
          <div className="field"><label className="section-label">DÍAS INHÁBILES</label>
            <div className="row" style={{ gap: 8 }}>
              <input className="input grow" type="date" value={inhabil} onChange={(e) => setInhabil(e.target.value)} />
              <button className="btn ghost" type="button" disabled={!inhabil || ag.inhabiles.includes(inhabil)} onClick={() => { poner({ inhabiles: [...ag.inhabiles, inhabil].sort() }); setInhabil(""); }}>Agregar</button>
            </div>
            <div className="chips">
              {ag.inhabiles.map((d) => (
                <button key={d} type="button" className="chip" title="Quitar" onClick={() => poner({ inhabiles: ag.inhabiles.filter((x) => x !== d) })}>
                  {new Date(`${d}T12:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" })} ×
                </button>
              ))}
            </div></div>
          <button className="btn primary" type="button" disabled={guardado || !ag.dias.length || ag.inicio >= ag.fin}
            onClick={async () => { await guardarAgenda(ag, sesion!.nombre); setGuardado(true); await cargar(); }}>
            {guardado ? "Guardado" : "Guardar horario"}
          </button>
        </div>

        <div className="card grow col" style={{ gap: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="col" style={{ gap: 2 }}>
              <h3 className="h3">Citas del {fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</h3>
              <span className="muted" style={{ fontSize: 12 }}>{slots.length ? `${citas.length} de ${capacidad} lugares ocupados` : "No se atiende este día"}</span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn ghost" style={{ padding: "8px 12px" }} type="button" aria-label="Día anterior" onClick={() => { const d = new Date(`${dia}T12:00`); d.setDate(d.getDate() - 1); setDia(d.toLocaleDateString("en-CA")); }}>‹</button>
              <input className="input" type="date" style={{ width: 170 }} value={dia} onChange={(e) => setDia(e.target.value)} />
              <button className="btn ghost" style={{ padding: "8px 12px" }} type="button" aria-label="Día siguiente" onClick={() => { const d = new Date(`${dia}T12:00`); d.setDate(d.getDate() + 1); setDia(d.toLocaleDateString("en-CA")); }}>›</button>
            </div>
          </div>
          {slots.length === 0 && <div className="acard flat"><span className="s">{ag.inhabiles.includes(dia) ? "Día inhábil." : "Día sin atención."} La app no ofrece citas este día.</span></div>}
          <div className="col" style={{ gap: 0 }}>
            {slots.map((s) => {
              const aqui = enSlot(s);
              const libres = ag.ventanillas - aqui.length;
              return (
                <div key={+s} className="list-row" style={{ alignItems: "flex-start" }}>
                  <strong style={{ width: 60, flex: "0 0 60px", fontSize: 13 }}>{hora(s)}</strong>
                  <div className="col grow" style={{ gap: 6 }}>
                    {aqui.map((c) => (
                      <div key={c.id} className="row" style={{ gap: 8, alignItems: "center" }}>
                        <span className={`tag ${ESTADOS[c.estado].color}`}>{c.folio}</span>
                        <span style={{ fontSize: 13 }}>{c.vecinoNombre}</span>
                        <span className="muted" style={{ fontSize: 12 }}>· {c.tramite}</span>
                      </div>
                    ))}
                    {libres > 0 && <span className="muted" style={{ fontSize: 12 }}>{libres === ag.ventanillas ? "Libre" : `${libres} lugar${libres === 1 ? "" : "es"} libre${libres === 1 ? "" : "s"}`}</span>}
                    {libres < 0 && <span className="tag rojo">Sobrecupo · {-libres} de más</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
