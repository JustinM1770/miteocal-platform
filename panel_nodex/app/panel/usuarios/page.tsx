"use client";

import { useEffect, useState } from "react";
import { NOMBRE_ROL, useAuth } from "@/lib/auth";
import { listarPersonal, type Usuario } from "@/lib/datos";
import { cfg } from "@/lib/config";

/* El rol y el municipio son custom claims: solo los asigna el Admin SDK
   (backend/seed/crear-funcionario.js o la Cloud
   Function). Por eso aquí no hay botón de «crear usuario»: se arma el
   comando exacto para quien tenga la llave de servicio. */

export default function Personal() {
  const { sesion } = useAuth();
  const [lista, setLista] = useState<Usuario[] | null>(null);
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<"funcionario" | "admin">("funcionario");
  const [area, setArea] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => { listarPersonal().then(setLista); }, []);

  // Un área con una sola persona se queda congelada el día que esa persona falta
  const porArea = (lista ?? []).filter((u) => u.rol === "funcionario" && u.area).reduce<Record<string, number>>((m, u) => {
    m[u.area] = (m[u.area] ?? 0) + 1; return m;
  }, {});
  const solas = Object.entries(porArea).filter(([, n]) => n < 2).map(([a]) => a);

  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
  const comando = `node seed/crear-funcionario.js ${correo.trim() || "correo@ejemplo.mx"} --rol ${rol} --municipio ${sesion?.municipioId ?? "<id>"}${area ? ` --area "${area}"` : ""} --produccion`;

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
      <div className="row">
        <div className="card grow col" style={{ gap: 0, paddingBottom: 8 }}>
          <div className="col" style={{ gap: 2, paddingBottom: 12 }}>
            <h3 className="h3">Personal de {cfg().nombre || "el municipio"}</h3>
            <span className="muted" style={{ fontSize: 13 }}>Cuentas con acceso al panel. El rol sale del token y no se puede editar desde aquí.</span>
          </div>
          {lista === null && <span className="muted">Cargando…</span>}
          {lista?.length === 0 && <span className="muted">No hay personal registrado en usuarios/ para este municipio.</span>}
          {lista?.map((u) => (
            <div className="list-row" key={u.id}>
              <strong style={{ width: 180, flex: "0 0 180px" }}>{u.nombre}</strong>
              <span className="muted grow">{u.area || "Sin área"}</span>
              <span className={`pill ${u.rol === "admin" ? "interno" : "publico"}`}>{NOMBRE_ROL[u.rol].toUpperCase()}</span>
            </div>
          ))}
        </div>

        <div className="card col" style={{ gap: 12, width: 420, flex: "0 0 420px" }}>
          <h3 className="h3">Dar de alta a alguien</h3>
          <span className="muted" style={{ fontSize: 13 }}>
            Lo corre quien tenga la llave de servicio de Firebase, desde la carpeta <code>backend/</code>. Crea la cuenta, le asigna rol y municipio, y muestra una contraseña temporal.
          </span>
          <div className="field"><label className="section-label">CORREO</label>
            <input className={`input${correo && !correoValido ? " error" : ""}`} type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre@municipio.gob.mx" /></div>
          <div className="field"><label className="section-label">ROL</label>
            <div className="seg">
              <button type="button" className={rol === "funcionario" ? "on azul" : ""} onClick={() => setRol("funcionario")}>Funcionario</button>
              <button type="button" className={rol === "admin" ? "on morado" : ""} onClick={() => setRol("admin")}>Administrador</button>
            </div></div>
          <div className="field"><label className="section-label">ÁREA · OPCIONAL</label>
            <select className="select" value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">Sin área</option>
              {cfg().catalogos.dependencias.map((d) => <option key={d}>{d}</option>)}
            </select></div>
          <pre style={{ background: "var(--ink)", color: "#e6e9ef", padding: 12, borderRadius: 10, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>{comando}</pre>
          <button className="btn primary" type="button" disabled={!correoValido}
            onClick={async () => { await navigator.clipboard.writeText(comando); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>
            {copiado ? "Copiado" : "Copiar comando"}
          </button>
          <span className="muted" style={{ fontSize: 12 }}>Si la persona ya tiene cuenta, el mismo comando solo le asigna permisos y no toca su contraseña.</span>
        </div>
      </div>
    </>
  );
}
