"use client";

import { useEffect, useState } from "react";
import { listarUsuarios, type Usuario } from "@/lib/datos";

export default function Usuarios() {
  const [lista, setLista] = useState<Usuario[]>([]);
  useEffect(() => { listarUsuarios().then(setLista); }, []);

  // Un área con un solo operador se queda congelada el día que esa persona falta
  const porArea = lista.filter((u) => u.rol === "operador").reduce<Record<string, number>>((m, u) => {
    m[u.area] = (m[u.area] ?? 0) + 1; return m;
  }, {});
  const solas = Object.entries(porArea).filter(([, n]) => n < 2).map(([a]) => a);

  return (
    <>
      {solas.length > 0 && (
        <div className="banner warn">
          <div className="col" style={{ gap: 3 }}>
            <strong>{solas.join(", ")} {solas.length === 1 ? "tiene" : "tienen"} un solo operador</strong>
            <span className="muted">Si esa persona se enferma, nadie puede actualizar la app. Da de alta a alguien más.</span>
          </div>
        </div>
      )}
      <div className="card col" style={{ gap: 0, paddingBottom: 8 }}>
        <div className="col" style={{ gap: 2, paddingBottom: 12 }}>
          <h3 className="h3">Usuarios y áreas</h3>
          <span className="muted" style={{ fontSize: 13 }}>
            Las cuentas se crean en Firebase Authentication; aquí se ve su rol y área (colección <code>usuarios</code>).
          </span>
        </div>
        {lista.map((u) => (
          <div className="list-row" key={u.id}>
            <strong style={{ width: 160, flex: "0 0 160px" }}>{u.nombre}</strong>
            <span className="muted grow">{u.area}</span>
            <span className={`pill ${u.rol === "admin" ? "interno" : "publico"}`}>
              {u.rol === "admin" ? "ADMINISTRADOR" : "OPERADOR"}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
