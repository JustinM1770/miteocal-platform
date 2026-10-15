"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import Modal from "@/components/Modal";
import SubirImagen from "@/components/SubirImagen";
import { aSlug } from "@/lib/config";
import { CATEGORIAS_COMERCIO, abiertoAhora, estadoLicencia, guardarComercio, listarComercios, type Comercio } from "@/lib/comercios";
import { coloniasDeZona, zonas } from "@/lib/config";

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
  const visibles = lista.filter((c) => (filtro === "Todos" || (filtro === "qboard.mx" ? c.qboard : c.categoria === filtro)) && (!q || `${c.nombre} ${c.direccion} ${c.colonia ?? ""}`.toLowerCase().includes(q)));

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="seg">
          {["Todos", ...CATEGORIAS_COMERCIO, "qboard.mx"].map((c) => (
            <button key={c} type="button" className={filtro === c ? "on azul" : ""} onClick={() => setFiltro(c)}>
              {c} · {c === "Todos" ? lista.length : c === "qboard.mx" ? lista.filter((x) => x.qboard).length : lista.filter((x) => x.categoria === c).length}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" style={{ width: 220 }} placeholder="Buscar comercio" aria-label="Buscar comercio" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          <button className="btn primary" type="button" onClick={() => setEditando({ ...NUEVO, dias: [...NUEVO.dias] })}>Agregar comercio</button>
        </div>
      </div>

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
              {c.whatsapp ? <div className="wa">Contactar por WhatsApp</div> : <span className="s">Sin WhatsApp: el vecino no podrá contactarlo.</span>}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
