"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { registrar } from "@/lib/datos";
import { aSlug, cfg, guardarConfig, type Emergencia } from "@/lib/config";

/* municipios/{id}/config/emergencias — lo que muestra «Servicios → Emergencias»
   en la app. Un teléfono equivocado es peor que ninguno: se valida el formato
   y se pide confirmar cada número antes de publicar. */

const CATEGORIAS = ["Emergencias", "Seguridad", "Salud", "Servicios"];
const COLOR: Record<string, string> = { Emergencias: "naranja", Seguridad: "azul", Salud: "rojo", Servicios: "verde" };
const telefonoValido = (t: string) => /^\+?[\d\s()-]{3,20}$/.test(t.trim()) && /\d{3}/.test(t);

export default function Directorio() {
  const { sesion } = useAuth();
  const [lista, setLista] = useState<Emergencia[]>(() => cfg().emergencias.map((e) => ({ ...e })));
  const [cambios, setCambios] = useState(false);
  const [verificados, setVerificados] = useState(false);
  const [estado, setEstado] = useState<"" | "guardando" | "listo" | "error">("");
  const poner = (i: number, c: Partial<Emergencia>) => { setLista((l) => l.map((x, k) => (k === i ? { ...x, ...c } : x))); setCambios(true); setVerificados(false); };
  const validos = lista.every((e) => e.nombre.trim() && telefonoValido(e.telefono));

  return (
    <div className="row">
      <div className="card grow col" style={{ gap: 12 }}>
        <div className="col" style={{ gap: 2 }}>
          <h3 className="h3">Directorio de emergencia</h3>
          <span className="muted" style={{ fontSize: 13 }}>El vecino los marca con un toque desde la app. Verifica cada número con la dependencia.</span>
        </div>
        <table className="tabla">
          <thead><tr><th>NOMBRE</th><th>TELÉFONO</th><th>CATEGORÍA</th><th>NOTA</th><th /></tr></thead>
          <tbody>
            {lista.map((e, i) => (
              <tr key={i}>
                <td><input className="input" value={e.nombre} aria-label="Nombre" onChange={(ev) => poner(i, { nombre: ev.target.value })} /></td>
                <td style={{ width: 170 }}><input className={`input${e.telefono && !telefonoValido(e.telefono) ? " error" : ""}`} type="tel" value={e.telefono} aria-label="Teléfono" onChange={(ev) => poner(i, { telefono: ev.target.value })} /></td>
                <td style={{ width: 150 }}>
                  <select className="select" value={e.categoria ?? "Emergencias"} aria-label="Categoría" onChange={(ev) => poner(i, { categoria: ev.target.value })}>
                    {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </td>
                <td><input className="input" value={e.nota ?? ""} placeholder="Atención 24 horas" aria-label="Nota" onChange={(ev) => poner(i, { nota: ev.target.value })} /></td>
                <td><button className="btn ghost" style={{ padding: 8 }} type="button" aria-label={`Quitar ${e.nombre}`} onClick={() => { setLista((l) => l.filter((_, k) => k !== i)); setCambios(true); setVerificados(false); }}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn ghost" style={{ alignSelf: "flex-start" }} type="button" onClick={() => { setLista((l) => [...l, { id: "", nombre: "", telefono: "", categoria: "Emergencias" }]); setCambios(true); setVerificados(false); }}>+ Agregar teléfono</button>
        {!validos && <span style={{ color: "var(--danger)", fontSize: 12 }}>Cada contacto necesita nombre y un teléfono válido.</span>}
        <label className="row" style={{ gap: 8, alignItems: "center", fontSize: 13 }}>
          <input type="checkbox" checked={verificados} onChange={(e) => setVerificados(e.target.checked)} disabled={!cambios} />
          Confirmé cada número con su dependencia.
        </label>
        <div className="row" style={{ justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
          {estado === "listo" && <span className="muted" style={{ fontSize: 13 }}>Guardado. Ya aparece en la app.</span>}
          {estado === "error" && <span style={{ color: "var(--danger)", fontSize: 13 }}>No se pudo guardar.</span>}
          <button className="btn primary" type="button" disabled={!cambios || !validos || !verificados || estado === "guardando"}
            onClick={async () => {
              setEstado("guardando");
              try {
                const limpia = lista.map((e) => ({ ...e, nombre: e.nombre.trim(), telefono: e.telefono.trim(), id: e.id || aSlug(e.nombre) }));
                await guardarConfig("emergencias", limpia);
                await registrar("Actualizó directorio de emergencia", `${limpia.length} teléfonos`, "publico", sesion!.nombre);
                setCambios(false); setVerificados(false); setEstado("listo");
              } catch { setEstado("error"); }
            }}>
            {estado === "guardando" ? "Guardando…" : "Publicar directorio"}
          </button>
        </div>
      </div>

      <div className="col" style={{ width: 330, flex: "0 0 330px", gap: 10 }}>
        <span className="section-label">ASÍ SE VERÁ EN LA APP</span>
        <div className="phone">
          <div><span className="h">Directorio de emergencia</span><div style={{ fontSize: 11, color: "var(--sec)" }}>Un toque para marcar</div></div>
          <div className="grid2">
            {lista.filter((e) => e.nombre).map((e, i) => (
              <div key={i} className="acard">
                <span className={`tag ${COLOR[e.categoria ?? ""] ?? "gris"}`} style={{ width: 30, height: 30, justifyContent: "center", alignItems: "center", borderRadius: 8 }}>✆</span>
                <span className="t" style={{ fontSize: 13 }}>{e.nombre}</span>
                <span className="s">{e.telefono || "Toca para marcar"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
