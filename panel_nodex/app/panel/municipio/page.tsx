"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Pestanas } from "@/components/graficas";
import { registrar } from "@/lib/datos";
import { cambiarModulo, cfg, guardarConfig, type Catalogos, type Feria, type Modulo } from "@/lib/config";
import { firebaseListo } from "@/lib/firebase";

type Vista = "feria" | "catalogos" | "modulos";

const NOMBRE_MODULO: Record<Modulo, string> = {
  agua: "Agua", basura: "Basura", reportes: "Reportes", comercio: "Comercio", noticias: "Noticias",
  escuelas: "Escuelas", feria: "Feria", paisanos: "Paisanos", tramites: "Trámites",
};

export default function Municipio() {
  const [vista, setVista] = useState<Vista>("feria");
  const c = cfg();
  return (
    <>
      <div className="row" style={{ alignItems: "center", gap: 10 }}>
        <h3 className="h3">{c.nombre || "Municipio"}{c.estado ? `, ${c.estado}` : ""}</h3>
        {c.faltantes.length > 0 && <span className="tag naranja">Falta: {c.faltantes.join(", ")}</span>}
      </div>
      <Pestanas<Vista> valor={vista} onCambio={setVista} opciones={[
        { id: "feria", nombre: "Feria" },
        { id: "catalogos", nombre: "Catálogos" },
        { id: "modulos", nombre: "Módulos" },
      ]} />
      {vista === "feria" && <EditorFeria />}
      {vista === "catalogos" && <EditorCatalogos />}
      {vista === "modulos" && <VerModulos />}
    </>
  );
}

function Guardar({ cambios, onGuardar }: { cambios: boolean; onGuardar: () => Promise<void> }) {
  const [estado, setEstado] = useState<"" | "guardando" | "listo" | "error">("");
  return (
    <div className="row" style={{ justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
      {estado === "listo" && <span className="muted" style={{ fontSize: 13 }}>Guardado. La app ya lo ve.</span>}
      {estado === "error" && <span style={{ color: "var(--danger)", fontSize: 13 }}>No se pudo guardar. Revisa tu conexión o tus permisos.</span>}
      <button className="btn primary" type="button" disabled={!cambios || estado === "guardando"}
        onClick={async () => {
          setEstado("guardando");
          try { await onGuardar(); setEstado("listo"); } catch { setEstado("error"); }
        }}>
        {estado === "guardando" ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}

function EditorFeria() {
  const { sesion } = useAuth();
  const [f, setF] = useState<Feria>(() => ({ ...cfg().feria }));
  const [cambios, setCambios] = useState(false);
  const poner = (c: Partial<Feria>) => { setF({ ...f, ...c }); setCambios(true); };
  const valida = f.nombre.trim() && f.inicio && f.fin && f.inicio <= f.fin;
  return (
    <div className="card col" style={{ gap: 14, maxWidth: 640 }}>
      <div className="field"><label className="section-label">NOMBRE</label>
        <input className="input" value={f.nombre} onChange={(e) => poner({ nombre: e.target.value })} placeholder="Feria de Noviembre 2026" /></div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field grow"><label className="section-label">EMPIEZA</label><input className="input" type="date" value={f.inicio} onChange={(e) => poner({ inicio: e.target.value })} /></div>
        <div className="field grow"><label className="section-label">TERMINA</label><input className="input" type="date" value={f.fin} min={f.inicio || undefined} onChange={(e) => poner({ fin: e.target.value })} /></div>
      </div>
      {f.inicio && f.fin && f.inicio > f.fin && <span style={{ color: "var(--danger)", fontSize: 12 }}>La fecha de fin es antes del inicio.</span>}
      <span className="muted" style={{ fontSize: 12 }}>El programa solo deja agregar eventos dentro de estas fechas.</span>
      <Guardar cambios={cambios && Boolean(valida)} onGuardar={async () => {
        await guardarConfig("feria", { ...f, nombre: f.nombre.trim() });
        await registrar("Actualizó fechas de la feria", `${f.nombre} · ${f.inicio} al ${f.fin}`, "interno", sesion!.nombre);
        setCambios(false);
      }} />
    </div>
  );
}

function ListaEditable({ titulo, ayuda, valores, onCambio }: { titulo: string; ayuda: string; valores: string[]; onCambio: (v: string[]) => void }) {
  const [nuevo, setNuevo] = useState("");
  const agregar = () => { const v = nuevo.trim(); if (v && !valores.includes(v)) onCambio([...valores, v]); setNuevo(""); };
  return (
    <div className="field">
      <label className="section-label">{titulo.toUpperCase()}</label>
      <span className="muted" style={{ fontSize: 12 }}>{ayuda}</span>
      <div className="chips">
        {valores.map((v) => (
          <button key={v} type="button" className="chip" title="Quitar" aria-label={`Quitar ${v}`} onClick={() => onCambio(valores.filter((x) => x !== v))}>{v} ×</button>
        ))}
        {valores.length === 0 && <span className="muted" style={{ fontSize: 12 }}>Vacío.</span>}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input className="input grow" value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregar())} placeholder="Escribe y presiona Enter" />
        <button className="btn ghost" type="button" disabled={!nuevo.trim()} onClick={agregar}>Agregar</button>
      </div>
    </div>
  );
}

function EditorCatalogos() {
  const { sesion } = useAuth();
  const [c, setC] = useState<Catalogos>(() => ({ ...cfg().catalogos }));
  const [cambios, setCambios] = useState(false);
  const poner = (k: keyof Catalogos) => (v: string[]) => { setC({ ...c, [k]: v }); setCambios(true); };
  return (
    <div className="card col" style={{ gap: 18, maxWidth: 760 }}>
      <ListaEditable titulo="Escenarios de la feria" ayuda="Dónde puede ocurrir un evento del programa." valores={c.escenarios} onCambio={poner("escenarios")} />
      <ListaEditable titulo="Templos" ayuda="Para los avisos parroquiales." valores={c.templos} onCambio={poner("templos")} />
      <ListaEditable titulo="Dependencias y áreas" ayuda="Áreas del ayuntamiento: avisos internos, trámites y personal." valores={c.dependencias} onCambio={poner("dependencias")} />
      <Guardar cambios={cambios} onGuardar={async () => {
        await guardarConfig("catalogos", c);
        await registrar("Actualizó catálogos del municipio", "escenarios, templos y dependencias", "interno", sesion!.nombre);
        setCambios(false);
      }} />
    </div>
  );
}

function VerModulos() {
  const { sesion } = useAuth();
  const [m, setM] = useState(() => ({ ...cfg().modulos }));
  const [ocupado, setOcupado] = useState<Modulo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(k: Modulo, activo: boolean) {
    setOcupado(k); setError(null);
    try {
      await cambiarModulo(k, activo);
      if (!firebaseListo) await registrar(activo ? "Encendió módulo" : "Apagó módulo", NOMBRE_MODULO[k], "publico", sesion!.nombre);
      setM((x) => ({ ...x, [k]: activo }));
    } catch (e) { setError((e as Error).message); }
    finally { setOcupado(null); }
  }

  return (
    <div className="card col" style={{ gap: 12, maxWidth: 640 }}>
      <span className="muted" style={{ fontSize: 13 }}>
        Un módulo apagado desaparece de la app de todos los vecinos y de este panel. Úsalo para lo que el municipio no tiene
        (por ejemplo, feria fuera de temporada) o todavía no está listo.
      </span>
      {error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>}
      {(Object.keys(NOMBRE_MODULO) as Modulo[]).map((k) => {
        const activo = m[k] !== false;
        return (
          <div key={k} className="list-row">
            <div className="col grow" style={{ gap: 1 }}>
              <strong>{NOMBRE_MODULO[k]}</strong>
              {m[k] === undefined && <span className="muted" style={{ fontSize: 11 }}>Sin definir: se muestra</span>}
            </div>
            <button type="button" className={`toggle${activo ? " on" : ""}`} aria-pressed={activo} aria-label={`${NOMBRE_MODULO[k]}: ${activo ? "encendido" : "apagado"}`}
              disabled={ocupado !== null} onClick={() => cambiar(k, !activo)}><span className="knob" /></button>
          </div>
        );
      })}
      <span className="muted" style={{ fontSize: 12 }}>El cambio queda en la bitácora. Recarga el panel para ver el menú actualizado.</span>
    </div>
  );
}
