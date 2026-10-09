"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Pestanas } from "@/components/graficas";
import { registrar } from "@/lib/datos";
import { aSlug, cfg, guardarConfig, type Catalogos, type Colonia, type Feria, type Modulo } from "@/lib/config";

type Vista = "colonias" | "feria" | "catalogos" | "modulos";

const NOMBRE_MODULO: Record<Modulo, string> = {
  agua: "Agua", basura: "Basura", reportes: "Reportes", comercio: "Comercio", noticias: "Noticias",
  escuelas: "Escuelas", feria: "Feria", paisanos: "Paisanos", tramites: "Trámites",
};

export default function Municipio() {
  const [vista, setVista] = useState<Vista>("colonias");
  const c = cfg();
  return (
    <>
      <div className="row" style={{ alignItems: "center", gap: 10 }}>
        <h3 className="h3">{c.nombre || "Municipio"}{c.estado ? `, ${c.estado}` : ""}</h3>
        {c.faltantes.length > 0 && <span className="tag naranja">Falta: {c.faltantes.join(", ")}</span>}
      </div>
      <Pestanas<Vista> valor={vista} onCambio={setVista} opciones={[
        { id: "colonias", nombre: "Colonias", n: c.colonias.length },
        { id: "feria", nombre: "Feria" },
        { id: "catalogos", nombre: "Catálogos" },
        { id: "modulos", nombre: "Módulos" },
      ]} />
      {vista === "colonias" && <EditorColonias />}
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

function EditorColonias() {
  const { sesion } = useAuth();
  const [lista, setLista] = useState<Colonia[]>(() => cfg().colonias.map((c) => ({ ...c })));
  const [cambios, setCambios] = useState(false);
  const zonasUsadas = [...new Set(lista.map((c) => c.zona).filter(Boolean))] as string[];
  const poner = (i: number, c: Partial<Colonia>) => { setLista((l) => l.map((x, k) => (k === i ? { ...x, ...c } : x))); setCambios(true); };
  const nombres = lista.map((c) => c.nombre.trim().toLowerCase());
  const repetidas = nombres.filter((n, i) => n && nombres.indexOf(n) !== i);
  const valida = lista.every((c) => c.nombre.trim()) && repetidas.length === 0;

  return (
    <div className="card col" style={{ gap: 12 }}>
      <span className="muted" style={{ fontSize: 13 }}>
        Las colonias sirven para que el vecino elija la suya al registrarse y para mandar avisos solo a quien le afectan.
        Las coordenadas (centroide) centran los mapas; son opcionales.
      </span>
      <table className="tabla">
        <thead><tr><th>COLONIA</th><th>ZONA</th><th>HORARIO DE AGUA</th><th>POZO</th><th>LAT</th><th>LNG</th><th /></tr></thead>
        <tbody>
          {lista.map((c, i) => (
            <tr key={i}>
              <td><input className={`input${repetidas.includes(c.nombre.trim().toLowerCase()) ? " error" : ""}`} value={c.nombre} aria-label="Nombre de la colonia" onChange={(e) => poner(i, { nombre: e.target.value, id: c.id || aSlug(e.target.value) })} /></td>
              <td><input className="input" list="zonas" value={c.zona ?? ""} aria-label="Zona" onChange={(e) => poner(i, { zona: e.target.value })} /></td>
              <td><input className="input" value={c.horario ?? ""} placeholder="6:00 – 14:00" aria-label="Horario de agua" onChange={(e) => poner(i, { horario: e.target.value })} /></td>
              <td><input className="input" value={c.pozo ?? ""} aria-label="Pozo" onChange={(e) => poner(i, { pozo: e.target.value })} /></td>
              <td style={{ width: 110 }}><input className="input" type="number" step="0.0001" value={c.lat ?? ""} aria-label="Latitud" onChange={(e) => poner(i, { lat: e.target.value === "" ? undefined : +e.target.value })} /></td>
              <td style={{ width: 120 }}><input className="input" type="number" step="0.0001" value={c.lng ?? ""} aria-label="Longitud" onChange={(e) => poner(i, { lng: e.target.value === "" ? undefined : +e.target.value })} /></td>
              <td><button className="btn ghost" style={{ padding: 8 }} type="button" aria-label={`Quitar ${c.nombre}`} onClick={() => { setLista((l) => l.filter((_, k) => k !== i)); setCambios(true); }}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <datalist id="zonas">{zonasUsadas.map((z) => <option key={z} value={z} />)}</datalist>
      {repetidas.length > 0 && <span style={{ color: "var(--danger)", fontSize: 12 }}>Hay colonias repetidas.</span>}
      <button className="btn ghost" style={{ alignSelf: "flex-start" }} type="button" onClick={() => { setLista((l) => [...l, { id: "", nombre: "", zona: zonasUsadas[0] ?? "" }]); setCambios(true); }}>+ Agregar colonia</button>
      <span className="muted" style={{ fontSize: 12 }}>Ojo: cambiar el nombre de una colonia no mueve a los vecinos que ya la eligieron.</span>
      <Guardar cambios={cambios && valida} onGuardar={async () => {
        const limpia = lista.map((c) => ({ ...c, nombre: c.nombre.trim(), id: c.id || aSlug(c.nombre) }));
        await guardarConfig("colonias", limpia);
        await registrar("Actualizó colonias", `${limpia.length} colonias`, "interno", sesion!.nombre);
        setCambios(false);
      }} />
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
      <ListaEditable titulo="Escuelas" ayuda="Las que pueden publicar avisos; los papás las siguen en la app." valores={c.escuelas} onCambio={poner("escuelas")} />
      <ListaEditable titulo="Templos" ayuda="Para los avisos parroquiales." valores={c.templos} onCambio={poner("templos")} />
      <ListaEditable titulo="Dependencias y áreas" ayuda="Áreas del ayuntamiento: avisos internos, trámites y personal." valores={c.dependencias} onCambio={poner("dependencias")} />
      <Guardar cambios={cambios} onGuardar={async () => {
        await guardarConfig("catalogos", c);
        await registrar("Actualizó catálogos del municipio", "escenarios, escuelas, templos y dependencias", "interno", sesion!.nombre);
        setCambios(false);
      }} />
    </div>
  );
}

function VerModulos() {
  const m = cfg().modulos;
  return (
    <div className="card col" style={{ gap: 12, maxWidth: 640 }}>
      <span className="muted" style={{ fontSize: 13 }}>
        Los módulos contratados viven en el documento del municipio. Un módulo apagado no aparece ni en la app ni en este panel.
        Solo el equipo de la plataforma puede cambiarlos.
      </span>
      {(Object.keys(NOMBRE_MODULO) as Modulo[]).map((k) => (
        <div key={k} className="list-row">
          <strong className="grow">{NOMBRE_MODULO[k]}</strong>
          {m[k] === false ? <span className="tag gris">Apagado</span> : m[k] ? <span className="tag verde">Encendido</span> : <span className="tag gris">Sin definir · se muestra</span>}
        </div>
      ))}
    </div>
  );
}
