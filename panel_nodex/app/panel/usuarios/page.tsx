"use client";

import { useCallback, useEffect, useState } from "react";
import { NOMBRE_ROL, useAuth } from "@/lib/auth";
import Modal from "@/components/Modal";
import { cfg } from "@/lib/config";
import { cambiarPersonal, darDeAlta, personal, type Persona, type RolPersonal } from "@/lib/personal";

/* Personal con acceso al panel. Alta, rol, área y desactivar pasan por las
   Cloud Functions crearPersonal / actualizarPersonal (el rol es un custom
   claim y el cliente no puede asignarlo). */

const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());

export default function Personal() {
  const { sesion } = useAuth();
  const [lista, setLista] = useState<Persona[] | null>(null);
  const [editando, setEditando] = useState<Persona | null>(null);
  const [confirmar, setConfirmar] = useState<Persona | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"activos" | "todos">("activos");

  const cargar = useCallback(async () => setLista(await personal()), []);
  useEffect(() => { cargar(); }, [cargar]);

  const activos = (lista ?? []).filter((p) => p.activo !== false);
  // Un área con una sola persona se queda congelada el día que esa persona falta
  const porArea = activos.filter((u) => u.rol === "funcionario" && u.area).reduce<Record<string, number>>((m, u) => { m[u.area] = (m[u.area] ?? 0) + 1; return m; }, {});
  const solas = Object.entries(porArea).filter(([, n]) => n < 2).map(([a]) => a);
  const visibles = filtro === "activos" ? activos : lista ?? [];

  async function accion(fn: () => Promise<void>) {
    setError(null);
    try { await fn(); await cargar(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      {solas.length > 0 && (
        <div className="banner warn">
          <div className="col" style={{ gap: 3 }}>
            <strong>{solas.join(", ")} {solas.length === 1 ? "tiene" : "tienen"} una sola persona</strong>
            <span className="muted">Si esa persona se enferma, nadie puede actualizar la app. Da de alta a alguien más.</span>
          </div>
        </div>
      )}
      {error && <div className="banner" role="alert" style={{ background: "var(--danger-soft)" }}><span style={{ color: "var(--danger)", fontWeight: 600 }}>{error}</span><button className="btn ghost" style={{ padding: "6px 10px" }} type="button" onClick={() => setError(null)}>Cerrar</button></div>}

      <div className="row">
        <div className="card grow col" style={{ gap: 0, paddingBottom: 8 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", paddingBottom: 12 }}>
            <div className="col" style={{ gap: 2 }}>
              <h3 className="h3">Personal de {cfg().nombre || "el municipio"}</h3>
              <span className="muted" style={{ fontSize: 13 }}>{activos.length} con acceso al panel</span>
            </div>
            <div className="seg">
              <button type="button" className={filtro === "activos" ? "on azul" : ""} onClick={() => setFiltro("activos")}>Activos</button>
              <button type="button" className={filtro === "todos" ? "on azul" : ""} onClick={() => setFiltro("todos")}>Todos · {lista?.length ?? 0}</button>
            </div>
          </div>
          {lista === null && <span className="muted">Cargando…</span>}
          {lista?.length === 0 && <span className="muted">No hay personal registrado.</span>}
          {lista && lista.length > 0 && (
            <table className="tabla">
              <thead><tr><th>PERSONA</th><th>ÁREA</th><th>ROL</th><th>ESTADO</th><th /></tr></thead>
              <tbody>
                {visibles.map((u) => {
                  const yo = u.id === sesion?.uid;
                  return (
                    <tr key={u.id} style={{ opacity: u.activo === false ? 0.55 : 1 }}>
                      <td><div className="row" style={{ gap: 10, alignItems: "center" }}>
                        <span className="avatar">{u.nombre[0]}</span>
                        <div><strong>{u.nombre}{yo ? " (tú)" : ""}</strong><div className="muted" style={{ fontSize: 11 }}>{u.correo ?? ""}</div></div>
                      </div></td>
                      <td className="muted">{u.area || "Sin área"}</td>
                      <td><span className={`pill ${u.rol === "admin" ? "interno" : "publico"}`}>{NOMBRE_ROL[u.rol].toUpperCase()}</span></td>
                      <td>{u.activo === false ? <span className="tag gris">Desactivada</span> : <span className="tag verde">Activa</span>}</td>
                      <td className="num" style={{ whiteSpace: "nowrap" }}>
                        <button className="btn ghost" style={{ padding: "5px 10px" }} type="button" onClick={() => setEditando(u)}>Editar</button>{" "}
                        <button className="btn ghost" style={{ padding: "5px 10px", color: u.activo === false ? undefined : "var(--danger)" }} type="button" disabled={yo}
                          title={yo ? "No puedes desactivarte a ti mismo" : undefined}
                          onClick={() => (u.activo === false ? accion(() => cambiarPersonal(u.id!, { activo: true }, sesion!.nombre, sesion!.uid)) : setConfirmar(u))}>
                          {u.activo === false ? "Reactivar" : "Desactivar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <Alta onListo={cargar} />
      </div>

      {editando && (
        <Editar persona={editando} esYo={editando.id === sesion?.uid} onCerrar={() => setEditando(null)}
          onGuardar={(c) => accion(async () => { await cambiarPersonal(editando.id!, c, sesion!.nombre, sesion!.uid); setEditando(null); })} />
      )}
      {confirmar && (
        <Modal titulo={`¿Desactivar a ${confirmar.nombre}?`} onCerrar={() => setConfirmar(null)} ancho={480}>
          <div className="col" style={{ gap: 14 }}>
            <span className="muted">Ya no podrá entrar al panel y se cerrarán sus sesiones abiertas. Lo que publicó se queda en la bitácora. Puedes reactivarla después.</span>
            <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
              <button className="btn ghost" type="button" onClick={() => setConfirmar(null)}>Cancelar</button>
              <button className="btn primary" type="button" style={{ background: "var(--danger)" }}
                onClick={() => accion(async () => { await cambiarPersonal(confirmar.id!, { activo: false }, sesion!.nombre, sesion!.uid); setConfirmar(null); })}>Sí, desactivar</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function Alta({ onListo }: { onListo: () => Promise<void> }) {
  const { sesion } = useAuth();
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<RolPersonal>("funcionario");
  const [area, setArea] = useState("");
  const [estado, setEstado] = useState<"" | "enviando">("");
  const [resultado, setResultado] = useState<{ enlace: string; nueva: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const comando = `node seed/crear-funcionario.js ${correo.trim() || "correo@ejemplo.mx"} --rol ${rol} --municipio ${sesion?.municipioId ?? "<id>"}${area ? ` --area "${area}"` : ""} --produccion`;

  return (
    <div className="card col" style={{ gap: 12, width: 420, flex: "0 0 420px" }}>
      <h3 className="h3">Dar de alta a alguien</h3>
      {resultado ? (
        <>
          <div className="banner" style={{ background: "var(--ok-soft)", display: "block" }}>
            <strong>{resultado.nueva ? "Cuenta creada" : "La cuenta ya existía: se le asignaron permisos"}</strong>
            <div className="muted" style={{ fontSize: 12 }}>Mándale este enlace por un canal privado para que cree su contraseña. Caduca en unas horas.</div>
          </div>
          <code style={{ fontSize: 11, wordBreak: "break-all", background: "var(--subtle)", padding: 10, borderRadius: 8 }}>{resultado.enlace}</code>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" type="button" onClick={async () => { await navigator.clipboard.writeText(resultado.enlace); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>{copiado ? "Copiado" : "Copiar enlace"}</button>
            <button className="btn ghost" type="button" onClick={() => { setResultado(null); setCorreo(""); setNombre(""); setArea(""); }}>Dar de alta a otra persona</button>
          </div>
        </>
      ) : (
        <>
          <div className="field"><label className="section-label">CORREO</label>
            <input className={`input${correo && !correoValido(correo) ? " error" : ""}`} type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre@municipio.gob.mx" /></div>
          <div className="field"><label className="section-label">NOMBRE</label>
            <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Laura Martínez" /></div>
          <div className="field"><label className="section-label">ROL</label>
            <div className="seg">
              <button type="button" className={rol === "funcionario" ? "on azul" : ""} onClick={() => setRol("funcionario")}>Funcionario</button>
              <button type="button" className={rol === "admin" ? "on morado" : ""} onClick={() => setRol("admin")}>Administrador</button>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{rol === "admin" ? "Ve el CRM (datos personales), la configuración y da de alta a otros." : "Publica y atiende lo de su municipio."}</span></div>
          <div className="field"><label className="section-label">ÁREA</label>
            <select className="select" value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">Sin área</option>
              {cfg().catalogos.dependencias.map((d) => <option key={d}>{d}</option>)}
            </select></div>
          {error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>}
          <button className="btn primary" type="button" disabled={!correoValido(correo) || estado === "enviando"}
            onClick={async () => {
              setEstado("enviando"); setError(null);
              try { setResultado(await darDeAlta({ correo: correo.trim(), nombre: nombre.trim(), rol, area: area || null }, sesion!.nombre)); await onListo(); }
              catch (e) { setError((e as Error).message); }
              finally { setEstado(""); }
            }}>
            {estado === "enviando" ? "Dando de alta…" : "Dar de alta"}
          </button>
          <details>
            <summary className="muted" style={{ fontSize: 12, cursor: "pointer" }}>Sin Cloud Functions: comando para el backend</summary>
            <pre style={{ background: "var(--ink)", color: "#e6e9ef", padding: 10, borderRadius: 8, fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: "8px 0 0" }}>{comando}</pre>
          </details>
        </>
      )}
    </div>
  );
}

function Editar({ persona, esYo, onCerrar, onGuardar }: { persona: Persona; esYo: boolean; onCerrar: () => void; onGuardar: (c: { rol?: RolPersonal; area?: string | null }) => void }) {
  const [rol, setRol] = useState<RolPersonal>(persona.rol === "admin" ? "admin" : "funcionario");
  const [area, setArea] = useState(persona.area ?? "");
  const cambios: { rol?: RolPersonal; area?: string | null } = {};
  if (rol !== persona.rol) cambios.rol = rol;
  if (area !== (persona.area ?? "")) cambios.area = area || null;
  return (
    <Modal titulo={`Editar a ${persona.nombre}`} onCerrar={onCerrar} ancho={480}>
      <div className="col" style={{ gap: 14 }}>
        <div className="field"><label className="section-label">ROL</label>
          <div className="seg">
            <button type="button" disabled={esYo} className={rol === "funcionario" ? "on azul" : ""} onClick={() => setRol("funcionario")}>Funcionario</button>
            <button type="button" disabled={esYo} className={rol === "admin" ? "on morado" : ""} onClick={() => setRol("admin")}>Administrador</button>
          </div>
          {esYo && <span className="muted" style={{ fontSize: 12 }}>No puedes cambiar tu propio rol.</span>}</div>
        <div className="field"><label className="section-label">ÁREA</label>
          <select className="select" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Sin área</option>
            {cfg().catalogos.dependencias.map((d) => <option key={d}>{d}</option>)}
          </select></div>
        <span className="muted" style={{ fontSize: 12 }}>La persona ve el cambio la próxima vez que entre al panel.</span>
        <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
          <button className="btn ghost" type="button" onClick={onCerrar}>Cancelar</button>
          <button className="btn primary" type="button" disabled={!Object.keys(cambios).length} onClick={() => onGuardar(cambios)}>Guardar</button>
        </div>
      </div>
    </Modal>
  );
}
