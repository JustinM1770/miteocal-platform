"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import Modal from "@/components/Modal";
import SubirImagen from "@/components/SubirImagen";
import { aSlug } from "@/lib/config";
import { CATEGORIAS_COMERCIO, abiertoAhora, estadoLicencia, guardarComercio, listarComercios, ventaAlcoholPermitida, enlacePedido, type Comercio } from "@/lib/comercios";
import { municipioId } from "@/lib/firebase";
import { cfg, coloniasDeZona, guardarConfig, zonas, type LeySeca } from "@/lib/config";
import { registrar } from "@/lib/datos";

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const NUEVO: Comercio = { nombre: "", categoria: CATEGORIAS_COMERCIO[0], whatsapp: "", destacado: false, aceptaUsd: false, enviaFamilia: false, direccion: "", descripcion: "", abre: "09:00", cierra: "20:00", dias: ["L", "M", "X", "J", "V", "S"], activo: true };
const whatsappValido = (w: string) => !w || /^\+?\d{10,15}$/.test(w.replace(/[\s-]/g, ""));
const estrellas = (n?: number) => (n ? "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n)) : "");

export default function Comercios() {
  const { sesion } = useAuth();
  const [lista, setLista] = useState<Comercio[]>([]);
  const [filtro, setFiltro] = useState("Todos");
  const [buscar, setBuscar] = useState("");
  const [editando, setEditando] = useState<Comercio | null>(null);

  const cargar = useCallback(async () => setLista([...(await listarComercios())]), []);
  useEffect(() => { cargar(); }, [cargar]);

  const q = buscar.trim().toLowerCase();
  const visibles = lista.filter((c) => (filtro === "Todos" || (filtro === "qboard.mx" ? c.qboard : filtro === "Venta de alcohol" ? c.licencia?.alcohol : c.categoria === filtro)) && (!q || `${c.nombre} ${c.direccion} ${c.colonia ?? ""}`.toLowerCase().includes(q)));

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="seg">
          {["Todos", ...CATEGORIAS_COMERCIO, "qboard.mx", "Venta de alcohol"].map((c) => (
            <button key={c} type="button" className={filtro === c ? "on azul" : ""} onClick={() => setFiltro(c)}>
              {c} · {c === "Todos" ? lista.length : c === "qboard.mx" ? lista.filter((x) => x.qboard).length : c === "Venta de alcohol" ? lista.filter((x) => x.licencia?.alcohol).length : lista.filter((x) => x.categoria === c).length}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" style={{ width: 220 }} placeholder="Buscar comercio" aria-label="Buscar comercio" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          <button className="btn primary" type="button" onClick={() => setEditando({ ...NUEVO, dias: [...NUEVO.dias] })}>Agregar comercio</button>
        </div>
      </div>

      <ControlLeySeca />

      {visibles.length === 0 && <div className="card muted">No hay comercios {filtro !== "Todos" ? "en esta categoría" : "todavía"}.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {visibles.map((c) => {
          const abierto = abiertoAhora(c);
          return (
            <button key={c.id} type="button" className="card col" style={{ gap: 6, textAlign: "left", cursor: "pointer", opacity: c.activo ? 1 : 0.5 }} onClick={() => setEditando({ ...c, dias: [...c.dias] })}>
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <strong>{c.nombre}</strong>
                <span className={`tag ${abierto ? "verde" : "gris"}`}>{abierto ? "Abierto" : "Cerrado"}</span>
              </div>
              {c.calificacion && <span style={{ fontSize: 12 }}><span className="stars">{estrellas(c.calificacion)}</span> {c.calificacion.toFixed(1)} · {c.resenas} reseñas</span>}
              <span className="muted" style={{ fontSize: 12 }}>{[c.direccion || c.colonia, c.categoria, c.empleados ? `${c.empleados} empleados` : ""].filter(Boolean).join(" · ")}</span>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {c.qboard && <span className="tag azul">qboard.mx</span>}
                {c.licencia?.alcohol && <span className={`tag ${ventaAlcoholPermitida(c, cfg().leySeca.activa) ? "naranja" : "gris"}`} title="Venta de alcohol">+18{cfg().leySeca.activa ? " · ley seca" : ""}</span>}
                {estadoLicencia(c) === "vencida" && <span className="tag rojo">Licencia vencida</span>}
                {c.destacado && <span className="tag azul">Destacado</span>}
                {c.aceptaUsd && <span className="tag verde">Acepta USD</span>}
                {c.enviaFamilia && <span className="tag morado">Envía a tu familia</span>}
                {!c.whatsapp && <span className="tag naranja">Sin WhatsApp</span>}
                {!c.activo && <span className="tag gris">Oculto</span>}
              </div>
            </button>
          );
        })}
      </div>

      {editando && (
        <Editor comercio={editando} onCerrar={() => setEditando(null)}
          onGuardar={async (c) => { await guardarComercio(c, sesion!.nombre); setEditando(null); await cargar(); }} />
      )}
    </>
  );
}

function Editor({ comercio, onCerrar, onGuardar }: { comercio: Comercio; onCerrar: () => void; onGuardar: (c: Comercio) => Promise<void> }) {
  const [c, setC] = useState<Comercio>(comercio);
  const [guardando, setGuardando] = useState(false);
  const poner = (x: Partial<Comercio>) => setC({ ...c, ...x });
  const qboardValido = !c.qboard?.tienda || /^https:\/\/(www\.)?qboard\.mx\//.test(c.qboard.tienda);
  const listo = c.nombre.trim() && whatsappValido(c.whatsapp) && c.dias.length > 0 && qboardValido && (!c.licencia || Boolean(c.licencia.vence));

  return (
    <Modal onCerrar={onCerrar} ancho={880} titulo={comercio.id ? "Editar comercio" : "Nuevo comercio"}>
      <div className="row" style={{ gap: 24 }}>
        <div className="col grow" style={{ gap: 14 }}>
          <div className="field"><label className="section-label">NOMBRE</label>
            <input className="input" value={c.nombre} disabled={Boolean(comercio.id)} onChange={(e) => poner({ nombre: e.target.value })} placeholder="Farmacia San Rafael" />
            {comercio.id && <span className="muted" style={{ fontSize: 11 }}>El nombre define el id del comercio y no se cambia.</span>}</div>
          <div className="field"><label className="section-label">CATEGORÍA</label>
            <div className="seg">{CATEGORIAS_COMERCIO.map((x) => <button key={x} type="button" className={c.categoria === x ? "on azul" : ""} onClick={() => poner({ categoria: x })}>{x}</button>)}</div></div>
          <div className="row" style={{ gap: 12 }}>
            <div className="field grow"><label className="section-label">WHATSAPP</label>
              <input className={`input${!whatsappValido(c.whatsapp) ? " error" : ""}`} type="tel" value={c.whatsapp} onChange={(e) => poner({ whatsapp: e.target.value })} placeholder="+52 346 000 0000" />
              {!whatsappValido(c.whatsapp) && <span style={{ color: "var(--danger)", fontSize: 11 }}>Con lada: 10 a 15 dígitos.</span>}</div>
            <div className="field grow"><label className="section-label">DIRECCIÓN</label>
              <input className="input" value={c.direccion} onChange={(e) => poner({ direccion: e.target.value })} placeholder="Zaragoza 45, Centro" /></div>
          </div>
          <SubirImagen carpeta="comercios" id={comercio.id ?? aSlug(c.nombre || "nuevo")} valor={c.portada ?? ""} onCambio={(portada) => poner({ portada })} etiqueta="Portada" />
          <div className="row" style={{ gap: 12 }}>
            <div className="field grow"><label className="section-label">COLONIA</label>
              <select className="select" value={c.colonia ?? ""} onChange={(e) => poner({ colonia: e.target.value })}>
                <option value="">Sin colonia</option>
                {zonas().map((z) => <optgroup key={z} label={z}>{coloniasDeZona(z).map((x) => <option key={x.id}>{x.nombre}</option>)}</optgroup>)}
              </select></div>
            <div className="field" style={{ width: 120 }}><label className="section-label">EMPLEADOS</label>
              <input className="input" type="number" min={0} value={c.empleados ?? 0} onChange={(e) => poner({ empleados: Math.max(0, +e.target.value) })} /></div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <div className="field grow"><label className="section-label">LICENCIA DE FUNCIONAMIENTO</label>
              <input className="input" value={c.licencia?.numero ?? ""} placeholder="LF-1234" onChange={(e) => poner({ licencia: e.target.value ? { numero: e.target.value, vence: c.licencia?.vence ?? "" } : null })} /></div>
            <div className="field" style={{ width: 170 }}><label className="section-label">VENCE</label>
              <input className="input" type="date" disabled={!c.licencia} value={c.licencia?.vence ?? ""} onChange={(e) => poner({ licencia: { numero: c.licencia?.numero ?? "", vence: e.target.value } })} /></div>
          </div>
          {c.licencia && (
            <div className="acard flat" style={{ gap: 8 }}>
              <label className="row" style={{ gap: 8, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" checked={Boolean(c.licencia.alcohol)} onChange={(e) => poner({ licencia: { ...c.licencia!, alcohol: e.target.checked, horarioAlcohol: e.target.checked ? c.licencia!.horarioAlcohol ?? { desde: "10:00", hasta: "22:00" } : undefined } })} />
                La licencia permite <strong>venta de bebidas alcohólicas</strong> (giro restringido)
              </label>
              {c.licencia.alcohol && (
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <span className="muted" style={{ fontSize: 12 }}>Horario permitido</span>
                  <input className="input" style={{ width: 120 }} type="time" aria-label="Venta de alcohol desde" value={c.licencia.horarioAlcohol?.desde ?? ""} onChange={(e) => poner({ licencia: { ...c.licencia!, horarioAlcohol: { desde: e.target.value, hasta: c.licencia!.horarioAlcohol?.hasta ?? "22:00" } } })} />
                  <span className="muted">a</span>
                  <input className="input" style={{ width: 120 }} type="time" aria-label="Venta de alcohol hasta" value={c.licencia.horarioAlcohol?.hasta ?? ""} onChange={(e) => poner({ licencia: { ...c.licencia!, horarioAlcohol: { desde: c.licencia!.horarioAlcohol?.desde ?? "10:00", hasta: e.target.value } } })} />
                </div>
              )}
              <span className="muted" style={{ fontSize: 11 }}>En la app solo lo ven mayores de 18, nunca aparece como destacado y se oculta durante la ley seca.</span>
            </div>
          )}
          <div className="field"><label className="section-label">TIENDA EN QBOARD.MX · OPCIONAL</label>
            <input className={`input${c.qboard?.tienda && !/^https:\/\/(www\.)?qboard\.mx\//.test(c.qboard.tienda) ? " error" : ""}`} value={c.qboard?.tienda ?? ""} placeholder="https://qboard.mx/mi-negocio"
              onChange={(e) => poner({ qboard: e.target.value ? { tienda: e.target.value, desde: c.qboard?.desde ?? new Date().toLocaleDateString("en-CA") } : null })} />
            <span className="muted" style={{ fontSize: 11 }}>Si vende en qboard.mx, sus ventas y pedidos aparecen en Indicadores.</span></div>
          <div className="field"><label className="section-label">DESCRIPCIÓN · OPCIONAL</label>
            <input className="input" value={c.descripcion} onChange={(e) => poner({ descripcion: e.target.value })} /></div>
          <div className="field"><label className="section-label">HORARIO</label>
            <div className="row" style={{ gap: 10, alignItems: "center" }}>
              <input className="input" style={{ width: 130 }} type="time" value={c.abre} aria-label="Abre" onChange={(e) => poner({ abre: e.target.value })} />
              <span className="muted">a</span>
              <input className="input" style={{ width: 130 }} type="time" value={c.cierra} aria-label="Cierra" onChange={(e) => poner({ cierra: e.target.value })} />
            </div>
            <div className="dias">{DIAS.map((d) => (
              <button key={d} type="button" className={`dia${c.dias.includes(d) ? " on" : ""}`} aria-pressed={c.dias.includes(d)}
                onClick={() => poner({ dias: DIAS.filter((x) => (x === d ? !c.dias.includes(d) : c.dias.includes(x))) })}>{d}</button>
            ))}</div></div>
          {([
            ["destacado", "Destacado", "Aparece primero en Comercio y en Inicio."],
            ["aceptaUsd", "Acepta dólares", "Se marca con «Acepta USD» para los paisanos."],
            ["enviaFamilia", "Envía a tu familia", "Aparece en Paisanos: entrega en el municipio pagada desde EE. UU."],
            ["formal", "Formalizado (RFC)", "Dado de alta en el SAT."],
            ["activo", "Visible en la app", "Apágalo para ocultarlo sin borrarlo."],
          ] as const).map(([k, t, s]) => (
            <div key={k} className="row" style={{ alignItems: "center", gap: 14 }}>
              <div className="col grow" style={{ gap: 2 }}><strong style={{ fontSize: 13 }}>{t}</strong><span className="muted" style={{ fontSize: 12 }}>{s}</span></div>
              <button type="button" className={`toggle${c[k] ? " on" : ""}`} aria-pressed={c[k]} aria-label={t} onClick={() => poner({ [k]: !c[k] })}><span className="knob" /></button>
            </div>
          ))}
          <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button className="btn ghost" type="button" onClick={onCerrar}>Cancelar</button>
            <button className="btn primary" type="button" disabled={!listo || guardando} onClick={async () => { setGuardando(true); await onGuardar({ ...c, nombre: c.nombre.trim() }); }}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>

        <div className="col" style={{ width: 290, flex: "0 0 290px", gap: 10 }}>
          <span className="section-label">ASÍ SE VERÁ EN LA APP</span>
          <div className="phone">
            <div className="acard" style={{ overflow: "hidden" }}>
              <div className="img-ph" style={{ background: c.portada ? `center/cover url(${c.portada})` : "var(--warn-soft)" }} />
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="t">{c.nombre || "Nombre del comercio"}</span>
                <span className={`tag ${abiertoAhora(c) ? "verde" : "gris"}`}>{abiertoAhora(c) ? "Abierto" : "Cerrado"}</span>
              </div>
              <span className="s">{[c.direccion, c.categoria].filter(Boolean).join(" · ")}</span>
              {c.aceptaUsd && <span className="tag verde">Acepta USD</span>}
              {c.descripcion && <span className="s">{c.descripcion}</span>}
              {enlacePedido(c, municipioId()) && <div className="btn primary" style={{ padding: 9 }} title={enlacePedido(c, municipioId()) ?? ""}>Pedir en línea</div>}
              {c.whatsapp ? <div className="wa">Contactar por WhatsApp</div> : <span className="s">Sin WhatsApp: el vecino no podrá contactarlo.</span>}
              {c.licencia?.alcohol && <span className="s">+18 · venta de alcohol solo para mayores de edad</span>}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Ley seca: mientras está activa, la app oculta la venta de alcohol en todo el municipio */
function ControlLeySeca() {
  const { sesion } = useAuth();
  const [ley, setLey] = useState<LeySeca>(() => ({ ...cfg().leySeca }));
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState<LeySeca>(ley);
  const [error, setError] = useState<string | null>(null);

  async function guardar(nueva: LeySeca) {
    setError(null);
    try {
      await guardarConfig("leySeca", nueva);
      await registrar(nueva.activa ? "Activó ley seca" : "Desactivó ley seca", nueva.activa ? `${nueva.motivo}${nueva.desde ? ` · ${nueva.desde} a ${nueva.hasta}` : ""}` : "venta de alcohol permitida", "publico", sesion!.nombre);
      setLey(nueva); setEditando(false);
    } catch { setError("No se pudo guardar."); }
  }

  return (
    <div className="banner" style={{ background: ley.activa ? "var(--danger-soft)" : "var(--subtle)" }}>
      <div className="col" style={{ gap: 2 }}>
        <strong style={{ color: ley.activa ? "var(--danger)" : undefined }}>{ley.activa ? `Ley seca activa · ${ley.motivo}` : "Venta de alcohol permitida"}</strong>
        <span className="muted" style={{ fontSize: 12 }}>
          {ley.activa ? `La app oculta la venta de alcohol${ley.desde ? ` del ${ley.desde} al ${ley.hasta}` : ""}.` : "Activa la ley seca en elecciones o eventos: la app oculta la venta de alcohol en todo el municipio."}
        </span>
        {error && <span style={{ color: "var(--danger)", fontSize: 12 }}>{error}</span>}
      </div>
      {ley.activa
        ? <button className="btn ghost" type="button" onClick={() => guardar({ ...ley, activa: false })}>Terminar ley seca</button>
        : <button className="btn ghost" type="button" onClick={() => { setBorrador({ activa: true, motivo: "", desde: new Date().toLocaleDateString("en-CA"), hasta: new Date().toLocaleDateString("en-CA") }); setEditando(true); }}>Activar ley seca</button>}
      {editando && (
        <Modal titulo="Activar ley seca" onCerrar={() => setEditando(false)} ancho={480}>
          <div className="col" style={{ gap: 12 }}>
            <div className="field"><label className="section-label">MOTIVO</label>
              <input className="input" value={borrador.motivo} onChange={(e) => setBorrador({ ...borrador, motivo: e.target.value })} placeholder="Jornada electoral" /></div>
            <div className="row" style={{ gap: 10 }}>
              <div className="field grow"><label className="section-label">DESDE</label><input className="input" type="date" value={borrador.desde} onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })} /></div>
              <div className="field grow"><label className="section-label">HASTA</label><input className="input" type="date" min={borrador.desde} value={borrador.hasta} onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })} /></div>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>Se activa ahora mismo. Al terminar, desactívala aquí.</span>
            <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
              <button className="btn ghost" type="button" onClick={() => setEditando(false)}>Cancelar</button>
              <button className="btn primary" type="button" style={{ background: "var(--danger)" }} disabled={!borrador.motivo.trim() || !borrador.desde || !borrador.hasta || borrador.hasta < borrador.desde}
                onClick={() => guardar({ ...borrador, motivo: borrador.motivo.trim() })}>Activar ley seca</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
