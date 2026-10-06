"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { SECCIONES, seccionDe } from "@/lib/navegacion";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { sesion, salir } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const actual = seccionDe(path);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>Nodex</h1>
          <p>Panel del Ayuntamiento</p>
        </div>

        {SECCIONES.filter((s) => !s.admin || sesion?.rol === "admin").map((s) => (
          <button key={s.nombre} type="button"
            className={`nav-item${actual?.seccion === s ? " active" : ""}${s.interno ? " internal" : ""}`}
            onClick={() => router.push(s.paginas[0].href)}>
            <span className="dot" />
            {s.nombre}
          </button>
        ))}
      </aside>

      <div className="main">
        <header className="topbar">
          <h2>{actual?.seccion.nombre ?? "Panel"}</h2>
          <div className="right">
            <span className="pill publico">Área: {sesion?.area}</span>
            <span className="muted" style={{ fontWeight: 500 }}>
              {sesion?.nombre} · {sesion?.rol === "admin" ? "Administrador" : "Operador"}
            </span>
            <button
              className="btn ghost"
              style={{ padding: "8px 12px" }}
              onClick={async () => { await salir(); router.push("/login"); }}
              type="button"
            >
              Salir
            </button>
          </div>
        </header>

        {actual && actual.seccion.paginas.length > 1 && (
          <nav className="tabs subnav">
            {actual.seccion.paginas.map((p) => (
              <button key={p.href} type="button" className={p.href === path ? "on" : ""} onClick={() => router.push(p.href)}>
                {p.nombre}
              </button>
            ))}
          </nav>
        )}

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
