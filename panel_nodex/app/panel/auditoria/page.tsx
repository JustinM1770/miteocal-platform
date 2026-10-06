"use client";

import { useEffect, useState } from "react";
import { actividadReciente, aFecha, type Auditoria, type Canal } from "@/lib/datos";

export default function BitacoraAuditoria() {
  const [lista, setLista] = useState<Auditoria[]>([]);
  const [canal, setCanal] = useState<Canal | "todos">("todos");
  const [buscar, setBuscar] = useState("");

  useEffect(() => { actividadReciente(500).then(setLista); }, []);

  const q = buscar.trim().toLowerCase();
  const visibles = lista.filter((a) =>
    (canal === "todos" || a.canal === canal) &&
    (!q || `${a.autorNombre} ${a.accion} ${a.detalle}`.toLowerCase().includes(q)));

  return (
    <div className="card col" style={{ gap: 0, paddingBottom: 8 }}>
      <div className="col" style={{ gap: 12, paddingBottom: 12 }}>
        <div className="col" style={{ gap: 2 }}>
          <h3 className="h3">Bitácora de auditoría</h3>
          <span className="muted" style={{ fontSize: 13 }}>
            Todo lo que se publicó, corrigió o notificó, con quién y cuándo. No se puede editar ni borrar.
          </span>
        </div>
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <input className="input grow" placeholder="Buscar por persona, acción o colonia" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          <div className="chips" style={{ flexWrap: "nowrap" }}>
            {(["todos", "publico", "interno"] as const).map((c) => (
              <button key={c} type="button" className="chip"
                style={canal === c ? { background: "var(--brand)", color: "#fff" } : undefined}
                onClick={() => setCanal(c)}>
                {c === "todos" ? "Todo" : c === "publico" ? "Público" : "Interno"}
              </button>
            ))}
          </div>
        </div>
      </div>
      {visibles.length === 0 && <span className="muted" style={{ paddingBottom: 12 }}>Sin movimientos.</span>}
      {visibles.map((a, i) => (
        <div className="list-row" key={a.id ?? i}>
          <span className="muted" style={{ width: 130, fontSize: 12, flex: "0 0 130px" }}>
            {aFecha(a.creadoEn)?.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
          <strong style={{ width: 130, flex: "0 0 130px", fontSize: 13 }}>{a.autorNombre}</strong>
          <span className="muted grow" style={{ fontSize: 13 }}>{a.accion} · {a.detalle}</span>
          <span className={`pill ${a.canal}`}>{a.canal === "interno" ? "INTERNO" : "PÚBLICO"}</span>
        </div>
      ))}
    </div>
  );
}
