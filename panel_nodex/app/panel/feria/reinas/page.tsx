"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Pestanas } from "@/components/graficas";
import { COLONIAS } from "@/lib/datos";
import { listarVecinos, type Vecino } from "@/lib/vecinos";
import {
  CERTAMENES, cambiarCertamen, guardarCandidata, listarCandidatas, listarCertamenes, listarVotos,
  type Candidata, type Certamen, type EstadoCertamen, type Voto,
} from "@/lib/feria";

const COLORES = ["#f6d5e4", "#dfe7fb", "#fde8cf", "#dcf2e4", "#ece4fb"];
const iniciales = (n: string) => n.split(" ").slice(0, 2).map((p) => p[0]).join("");

export default function Reinas() {
  const { sesion } = useAuth();
  const [certamen, setCertamen] = useState<Certamen>("reina");
  const [cands, setCands] = useState<Candidata[]>([]);
  const [estados, setEstados] = useState<EstadoCertamen[]>([]);
  const [votos, setVotos] = useState<Voto[]>([]);
  const [vecinos, setVecinos] = useState<Vecino[]>([]);
  const [nueva, setNueva] = useState(false);
  const [confirmarGanadora, setConfirmarGanadora] = useState<Candidata | null>(null);

  const cargar = useCallback(async () => {
    const [c, e, v, n] = await Promise.all([listarCandidatas(), listarCertamenes(), listarVotos(), listarVecinos()]);
    setCands([...c]); setEstados([...e]); setVotos(v); setVecinos(n);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const estado = estados.find((e) => e.certamen === certamen);
  const lista = cands.filter((c) => c.certamen === certamen);
  const votosC = votos.filter((v) => v.certamen === certamen);
  const total = votosC.length;
  const cuenta = (id: string) => votosC.filter((v) => v.candidataId === id).length;
  const orden = [...lista].sort((a, b) => cuenta(b.id!) - cuenta(a.id!));
  const vecinoDe = new Map(vecinos.map((v) => [v.id, v]));
  const participacion = Math.round((total / Math.max(1, vecinos.length)) * 100);

  return (
    <>
      <Pestanas
        opciones={(Object.keys(CERTAMENES) as Certamen[]).map((c) => ({ id: c, nombre: CERTAMENES[c], n: cands.filter((x) => x.certamen === c).length }))}
        valor={certamen} onCambio={setCertamen} />

      {estado && (
        <div className="card row" style={{ alignItems: "center", gap: 18 }}>
          <div className="col grow" style={{ gap: 4 }}>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <span className={`pill ${estado.ganadoraId ? "publico" : estado.votacionAbierta ? "activo" : "sin_dato"}`}>
                {estado.ganadoraId ? "GANADORA PUBLICADA" : estado.votacionAbierta ? "VOTACIÓN ABIERTA" : "VOTACIÓN CERRADA"}
              </span>
              <strong>{total.toLocaleString("es-MX")} votos · {participacion}% de los vecinos</strong>
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              Un voto por cuenta verificada por SMS. Cierra el {new Date(estado.cierraEn).toLocaleString("es-MX", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}.
            </span>
          </div>
          {!estado.ganadoraId && (
            <button className="btn ghost" type="button" onClick={async () => {
              await cambiarCertamen(estado, { votacionAbierta: !estado.votacionAbierta }, estado.votacionAbierta ? "Cerró la votación" : "Abrió la votación", sesion!.nombre);
              await cargar();
            }}>
              {estado.votacionAbierta ? "Cerrar votación" : "Reabrir votación"}
            </button>
          )}
          <button className="btn primary" type="button" onClick={() => setNueva(true)}>Agregar candidata</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
        {orden.map((c, i) => {
          const n = cuenta(c.id!);
          const pct = total ? Math.round((n / total) * 100) : 0;
          const ganadora = estado?.ganadoraId === c.id;
          return (
            <div key={c.id} className="card col" style={{ gap: 10, padding: 14, borderColor: ganadora ? "var(--brand)" : undefined, borderWidth: ganadora ? 2 : 1 }}>
              <div className="foto-cand" style={{ background: c.color, position: "relative" }}>
                {iniciales(c.nombre)}
                {i === 0 && total > 0 && !ganadora && <span className="tag naranja" style={{ position: "absolute", top: 8, left: 8 }}>Va en 1.º</span>}
                {ganadora && <span className="tag azul" style={{ position: "absolute", top: 8, left: 8 }}>♛ Ganadora</span>}
              </div>
              <div className="col" style={{ gap: 2 }}>
                <strong style={{ fontSize: 15 }}>{c.nombre}</strong>
                <span className="muted" style={{ fontSize: 12 }}>{c.edad} años · {c.representa}</span>
              </div>
              <span className="muted" style={{ fontSize: 12, minHeight: 34 }}>{c.semblanza}</span>
              <div className="col" style={{ gap: 4 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{n.toLocaleString("es-MX")} votos</strong><span className="muted">{pct}%</span>
                </div>
                <div className="ocupacion"><div style={{ width: `${pct}%` }} /></div>
              </div>
              {estado && !estado.votacionAbierta && !estado.ganadoraId && (
                <button className="btn ghost" type="button" style={{ padding: "8px 10px" }} onClick={() => setConfirmarGanadora(c)}>Declarar ganadora</button>
              )}
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <div className="card col" style={{ gap: 0, paddingBottom: 8 }}>
          <div className="col" style={{ gap: 2, paddingBottom: 12 }}>
            <h3 className="h3">De dónde vienen los votos</h3>
            <span className="muted" style={{ fontSize: 12 }}>Votos por colonia del vecino; los paisanos cuentan en la colonia de su familia.</span>
          </div>
          <table className="tabla">
            <thead>
              <tr><th>COLONIA</th>{orden.map((c) => <th key={c.id} className="num">{c.nombre.split(" ")[0].toUpperCase()}</th>)}<th className="num">PAISANOS</th><th className="num">TOTAL</th></tr>
            </thead>
            <tbody>
              {COLONIAS.map((col) => {
                const vs = votosC.filter((v) => vecinoDe.get(v.vecinoId)?.colonia === col.nombre);
                return (
                  <tr key={col.nombre}>
                    <td><strong>{col.nombre}</strong></td>
                    {orden.map((c) => <td key={c.id} className="num">{vs.filter((v) => v.candidataId === c.id).length}</td>)}
                    <td className="num muted">{vs.filter((v) => vecinoDe.get(v.vecinoId)?.tipo === "paisano").length}</td>
                    <td className="num"><strong>{vs.length}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {nueva && (
        <NuevaCandidata certamen={certamen} onCerrar={() => setNueva(false)}
          onGuardar={async (c) => { await guardarCandidata(c, sesion!.nombre); setNueva(false); await cargar(); }} />
      )}

      {confirmarGanadora && estado && (
        <div className="scrim" onClick={() => setConfirmarGanadora(null)}>
          <div className="modal col" style={{ width: 480, gap: 16 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>¿Publicar a {confirmarGanadora.nombre} como {CERTAMENES[certamen]}?</h3>
            <span className="muted">Aparecerá en la app como ganadora y se enviará una notificación a todos los vecinos. No se puede deshacer.</span>
            <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
              <button className="btn ghost" type="button" onClick={() => setConfirmarGanadora(null)}>Cancelar</button>
              <button className="btn primary" type="button" onClick={async () => {
                await cambiarCertamen(estado, { ganadoraId: confirmarGanadora.id! }, `Publicó ganadora: ${confirmarGanadora.nombre}`, sesion!.nombre);
                setConfirmarGanadora(null); await cargar();
              }}>Sí, publicar ganadora</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NuevaCandidata({ certamen, onCerrar, onGuardar }: {
  certamen: Certamen; onCerrar: () => void; onGuardar: (c: Omit<Candidata, "id">) => Promise<void>;
}) {
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState(certamen === "reina" ? 18 : 6);
  const [representa, setRepresenta] = useState(COLONIAS[0].nombre);
  const [semblanza, setSemblanza] = useState("");
  const [color, setColor] = useState(COLORES[0]);
  const rango = certamen === "reina" ? [17, 25] : [4, 9];
  const listo = nombre.trim() && semblanza.trim() && edad >= rango[0] && edad <= rango[1];

  return (
    <div className="scrim" onClick={onCerrar}>
      <div className="modal row" style={{ width: 760, gap: 24 }} onClick={(e) => e.stopPropagation()}>
        <div className="col grow" style={{ gap: 14 }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Nueva candidata · {CERTAMENES[certamen]}</h3>
          <div className="field"><label className="section-label">NOMBRE COMPLETO</label>
            <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ width: 110 }}><label className="section-label">EDAD</label>
              <input className="input" type="number" min={rango[0]} max={rango[1]} value={edad} onChange={(e) => setEdad(+e.target.value)} /></div>
            <div className="field grow"><label className="section-label">REPRESENTA A</label>
              <select className="select" value={representa} onChange={(e) => setRepresenta(e.target.value)}>
                {COLONIAS.map((c) => <option key={c.nombre}>{c.nombre}</option>)}
                <option>Hijos Ausentes</option>
              </select></div>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>Edad permitida: {rango[0]} a {rango[1]} años.</span>
          <div className="field"><label className="section-label">SEMBLANZA</label>
            <textarea className="textarea" value={semblanza} onChange={(e) => setSemblanza(e.target.value)} placeholder="Una o dos frases: estudios, a qué se dedica, qué la representa." /></div>
          <div className="field"><label className="section-label">FOTO</label>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              {COLORES.map((c) => (
                <button key={c} type="button" aria-label="Color de fondo" onClick={() => setColor(c)}
                  style={{ width: 28, height: 28, borderRadius: 8, background: c, border: color === c ? "2px solid var(--brand)" : "1px solid var(--border)" }} />
              ))}
              <span className="muted" style={{ fontSize: 12 }}>La foto se sube cuando el almacenamiento de Firebase esté activo.</span>
            </div></div>
          <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button className="btn ghost" type="button" onClick={onCerrar}>Cancelar</button>
            <button className="btn primary" type="button" disabled={!listo}
              onClick={() => onGuardar({ certamen, nombre: nombre.trim(), edad, representa, semblanza: semblanza.trim(), color })}>
              Registrar candidata
            </button>
          </div>
        </div>
        <div className="col" style={{ width: 240, flex: "0 0 240px", gap: 10 }}>
          <span className="section-label">ASÍ SE VERÁ EN LA APP</span>
          <div className="phone">
            <div className="phone-head"><span className="back">‹</span><div><strong>{CERTAMENES[certamen]}</strong><span>Vota por tu favorita</span></div></div>
            <div className="acard" style={{ padding: 10 }}>
              <div className="foto-cand" style={{ background: color, height: 110 }}>{nombre ? iniciales(nombre) : "?"}</div>
              <span className="t">{nombre || "Nombre"}</span>
              <span className="s">{edad} años · {representa}</span>
              <span className="s">{semblanza || "Semblanza"}</span>
              <div className="btn primary" style={{ padding: 9 }}>Votar</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
