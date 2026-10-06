"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { pesos } from "@/lib/almacen";
import {
  CATEGORIAS, ESCENARIOS, FERIA, guardarEvento, listarEventos, listarPagos, vendidos,
  type CategoriaEvento, type Evento, type Pago, type Zona,
} from "@/lib/feria";

const fechaLarga = (s: string) => new Date(`${s}T12:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
const dd = (s: string) => s.slice(8, 10);
const mmm = (s: string) => new Date(`${s}T12:00`).toLocaleDateString("es-MX", { month: "short" }).replace(".", "").toUpperCase();

function disponibilidad(e: Evento, pagos: Pago[]) {
  if (!e.zonas.length) return { texto: "Entrada libre", color: "verde" };
  const cupo = e.zonas.reduce((s, z) => s + z.cupo, 0);
  const pct = vendidos(pagos, e.id!) / cupo;
  if (pct >= 0.98) return { texto: "Agotado", color: "gris" };
  if (pct >= 0.8) return { texto: "Últimos lugares", color: "naranja" };
  return { texto: "Disponible", color: "verde" };
}

export default function Programa() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [filtro, setFiltro] = useState<CategoriaEvento | "todos">("todos");
  const [nuevo, setNuevo] = useState(false);

  const cargar = useCallback(async () => {
    const [e, p] = await Promise.all([listarEventos(), listarPagos()]);
    setEventos(e); setPagos(p);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = eventos.filter((e) => filtro === "todos" || e.categoria === filtro);
  const dias = [...new Set(visibles.map((e) => e.fecha))];

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="seg">
          <button type="button" className={filtro === "todos" ? "on azul" : ""} onClick={() => setFiltro("todos")}>Todo · {eventos.length}</button>
          {(Object.keys(CATEGORIAS) as CategoriaEvento[]).map((c) => {
            const n = eventos.filter((e) => e.categoria === c).length;
            return (
              <button key={c} type="button" className={filtro === c ? `on ${CATEGORIAS[c].color}` : ""} onClick={() => setFiltro(c)}>
                {CATEGORIAS[c].icono} {CATEGORIAS[c].nombre} · {n}
              </button>
            );
          })}
        </div>
        <button className="btn primary" type="button" onClick={() => setNuevo(true)} style={{ flex: "0 0 auto" }}>Agregar evento</button>
      </div>

      {dias.length === 0 && <div className="card muted">No hay eventos en esta categoría.</div>}

      {dias.map((dia) => (
        <div key={dia} className="col" style={{ gap: 10 }}>
          <span className="section-label">{fechaLarga(dia).toUpperCase()}</span>
          <div className="col" style={{ gap: 10 }}>
            {visibles.filter((e) => e.fecha === dia).map((e) => {
              const disp = disponibilidad(e, pagos);
              const cat = CATEGORIAS[e.categoria];
              const desde = e.zonas.length ? Math.min(...e.zonas.map((z) => z.precio)) : 0;
              return (
                <div key={e.id} className="card row" style={{ alignItems: "center", gap: 16, padding: "14px 18px" }}>
                  <div className="datebadge azul"><b>{dd(e.fecha)}</b><small>{mmm(e.fecha)}</small></div>
                  <div className="col grow" style={{ gap: 4 }}>
                    <div className="row" style={{ gap: 8, alignItems: "center" }}>
                      <span className={`tag ${cat.color}`}>{cat.icono} {cat.nombre}</span>
                      {e.transmitir && <span className="tag rojo">● Se transmite</span>}
                    </div>
                    <strong style={{ fontSize: 15 }}>{e.titulo}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>{e.escenario} · {e.hora} hrs{e.descripcion ? ` · ${e.descripcion}` : ""}</span>
                  </div>
                  {e.zonas.length > 0 && (
                    <div className="col" style={{ gap: 4, width: 220, flex: "0 0 220px" }}>
                      {e.zonas.map((z) => {
                        const v = vendidos(pagos, e.id!, z.nombre);
                        const pct = Math.min(100, Math.round((v / z.cupo) * 100));
                        return (
                          <div key={z.nombre} className="row" style={{ gap: 8, alignItems: "center" }} title={`${v} de ${z.cupo} vendidos`}>
                            <span className="muted" style={{ fontSize: 11, width: 72, flex: "0 0 72px" }}>{z.nombre}</span>
                            <div className={`ocupacion grow${pct >= 95 ? " lleno" : ""}`}><div style={{ width: `${pct}%` }} /></div>
                            <span style={{ fontSize: 11, width: 34, flex: "0 0 34px", textAlign: "right" }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="col" style={{ alignItems: "flex-end", gap: 4, width: 120, flex: "0 0 120px" }}>
                    <strong className="precio">{e.zonas.length ? `desde ${pesos(desde)}` : "Gratis"}</strong>
                    <span className={`tag ${disp.color}`}>{disp.texto}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {nuevo && <NuevoEvento onCerrar={() => setNuevo(false)} onGuardado={async () => { setNuevo(false); await cargar(); }} />}
    </>
  );
}

function NuevoEvento({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => Promise<void> }) {
  const { sesion } = useAuth();
  const [categoria, setCategoria] = useState<CategoriaEvento>("concierto");
  const [titulo, setTitulo] = useState("");
  const [escenario, setEscenario] = useState(ESCENARIOS[0]);
  const [fecha, setFecha] = useState(FERIA.inicio);
  const [hora, setHora] = useState("21:00");
  const [descripcion, setDescripcion] = useState("");
  const [libre, setLibre] = useState(false);
  const [zonas, setZonas] = useState<Zona[]>([{ nombre: "General", precio: 300, cupo: 1000 }]);
  const [transmitir, setTransmitir] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const listo = titulo.trim() && fecha && hora && (libre || zonas.every((z) => z.nombre && z.precio > 0 && z.cupo > 0));
  const cat = CATEGORIAS[categoria];
  const cambiarZona = (i: number, c: Partial<Zona>) => setZonas((l) => l.map((z, j) => (j === i ? { ...z, ...c } : z)));

  return (
    <div className="scrim" onClick={onCerrar}>
      <div className="modal" style={{ width: 920 }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ gap: 24 }}>
          <div className="col grow" style={{ gap: 16 }}>
            <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Agregar evento al programa</h3>
            <div className="field">
              <label className="section-label">TIPO DE EVENTO</label>
              <div className="seg">
                {(Object.keys(CATEGORIAS) as CategoriaEvento[]).map((c) => (
                  <button key={c} type="button" className={categoria === c ? `on ${CATEGORIAS[c].color}` : ""} onClick={() => setCategoria(c)}>
                    {CATEGORIAS[c].icono} {CATEGORIAS[c].nombre}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="section-label">{categoria === "concierto" ? "ARTISTA" : categoria === "toros" ? "CARTEL" : "NOMBRE DEL EVENTO"}</label>
              <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                placeholder={categoria === "concierto" ? "Banda El Recodo" : categoria === "toros" ? "Corrida de toros · Gran Feria" : categoria === "religioso" ? "Misa de Hijos Ausentes" : "Nombre"} />
            </div>
            <div className="row" style={{ gap: 12 }}>
              <div className="field grow">
                <label className="section-label">ESCENARIO</label>
                <select className="select" value={escenario} onChange={(e) => setEscenario(e.target.value)}>
                  {ESCENARIOS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field" style={{ width: 160 }}>
                <label className="section-label">FECHA</label>
                <input className="input" type="date" min={FERIA.inicio} max={FERIA.fin} value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="field" style={{ width: 120 }}>
                <label className="section-label">HORA</label>
                <input className="input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="section-label">DESCRIPCIÓN · OPCIONAL</label>
              <input className="input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Abre puertas a las 20:00 hrs." />
            </div>

            <div className="field">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <label className="section-label">BOLETOS</label>
                <div className="seg">
                  <button type="button" className={!libre ? "on azul" : ""} onClick={() => setLibre(false)}>Con boleto</button>
                  <button type="button" className={libre ? "on verde" : ""} onClick={() => setLibre(true)}>Entrada libre</button>
                </div>
              </div>
              {!libre && (
                <div className="col" style={{ gap: 8 }}>
                  <div className="row section-label" style={{ gap: 8 }}>
                    <span className="grow">ZONA</span><span style={{ width: 110 }}>PRECIO</span><span style={{ width: 110 }}>CUPO</span><span style={{ width: 34 }} />
                  </div>
                  {zonas.map((z, i) => (
                    <div key={i} className="row" style={{ gap: 8, alignItems: "center" }}>
                      <input className="input grow" value={z.nombre} onChange={(e) => cambiarZona(i, { nombre: e.target.value })} placeholder="General" />
                      <input className="input" style={{ width: 110 }} type="number" min={1} value={z.precio} onChange={(e) => cambiarZona(i, { precio: +e.target.value })} />
                      <input className="input" style={{ width: 110 }} type="number" min={1} value={z.cupo} onChange={(e) => cambiarZona(i, { cupo: +e.target.value })} />
                      <button className="btn ghost" style={{ width: 34, padding: 8 }} type="button" disabled={zonas.length === 1}
                        onClick={() => setZonas((l) => l.filter((_, j) => j !== i))} aria-label="Quitar zona">×</button>
                    </div>
                  ))}
                  <button className="btn ghost" style={{ alignSelf: "flex-start", padding: "8px 12px" }} type="button"
                    onClick={() => setZonas((l) => [...l, { nombre: "", precio: 0, cupo: 0 }])}>+ Agregar zona</button>
                </div>
              )}
            </div>

            <div className="row" style={{ alignItems: "center", gap: 14 }}>
              <div className="col grow" style={{ gap: 2 }}>
                <strong>Transmitir en vivo en la app</strong>
                <span className="muted" style={{ fontSize: 13 }}>Para los paisanos que no pueden venir. Se crea la transmisión programada.</span>
              </div>
              <button type="button" className={`toggle${transmitir ? " on" : ""}`} aria-pressed={transmitir} onClick={() => setTransmitir((v) => !v)}><span className="knob" /></button>
            </div>

            <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
              <button className="btn ghost" type="button" onClick={onCerrar}>Cancelar</button>
              <button className="btn primary" type="button" disabled={!listo || guardando}
                onClick={async () => {
                  setGuardando(true);
                  await guardarEvento({ titulo: titulo.trim(), categoria, escenario, fecha, hora, descripcion: descripcion.trim(), zonas: libre ? [] : zonas, transmitir, publicado: true }, sesion!.nombre);
                  await onGuardado();
                }}>
                {guardando ? "Guardando…" : "Publicar en el programa"}
              </button>
            </div>
          </div>

          <div className="col" style={{ width: 300, flex: "0 0 300px", gap: 10 }}>
            <span className="section-label">ASÍ SE VERÁ EN LA APP</span>
            <div className="phone">
              <div className="phone-head"><span className="back">‹</span><div><strong>Feria de Noviembre</strong><span>{escenario}</span></div></div>
              <span className="h">Cartelera</span>
              <div className="acard row" style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <div className="datebadge azul"><b>{dd(fecha)}</b><small>{mmm(fecha)}</small></div>
                <div className="col grow" style={{ gap: 2 }}>
                  <span className="t">{titulo || "Nombre del evento"}</span>
                  <span className="s">{escenario} · {hora} hrs</span>
                  <span className={`tag ${libre ? "verde" : "verde"}`}>{libre ? "Entrada libre" : "Disponible"}</span>
                </div>
                <strong style={{ fontSize: 14 }}>{libre ? "" : pesos(Math.min(...zonas.map((z) => z.precio || 0)))}</strong>
              </div>
              <span className={`tag ${cat.color}`}>{cat.icono} {cat.nombre}</span>
              {transmitir && <div className="acard flat"><span className="tag rojo">● EN VIVO el {dd(fecha)} {mmm(fecha)}</span><span className="s">Se podrá ver desde la app</span></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
