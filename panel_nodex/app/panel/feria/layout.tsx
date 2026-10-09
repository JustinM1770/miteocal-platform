"use client";

import { feria } from "@/lib/feria";

const d = (s: string) => new Date(`${s}T12:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long" });

export default function FeriaLayout({ children }: { children: React.ReactNode }) {
  const f = feria();
  return (
    <>
      <div className="row" style={{ alignItems: "center", gap: 10 }}>
        <span className="pill programado">{f.nombre.toUpperCase()}</span>
        {f.inicio && f.fin
          ? <span className="muted" style={{ fontSize: 13 }}>{d(f.inicio)} al {d(f.fin)}</span>
          : <span className="muted" style={{ fontSize: 13 }}>Sin fechas: captúralas en Administración → Municipio</span>}
      </div>
      {children}
    </>
  );
}
