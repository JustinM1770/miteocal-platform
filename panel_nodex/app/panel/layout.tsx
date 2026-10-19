"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Shell from "@/components/Shell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { sesion, sinAcceso, cargando, salir } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !sesion && !sinAcceso) router.replace("/login");
  }, [cargando, sesion, sinAcceso, router]);

  if (cargando) return <div className="spinner-wrap">Cargando…</div>;

  // Cuenta válida de Firebase pero sin rol o municipio: se explica qué falta
  if (sinAcceso) {
    return (
      <div className="login-wrap">
        <div className="login-card col" style={{ gap: 14 }}>
          <strong style={{ fontSize: 20 }}>Tu cuenta todavía no tiene acceso al panel</strong>
          <span className="muted">
            {sinAcceso.motivo === "sin-rol" && "Entraste bien, pero tu cuenta no tiene rol de funcionario o administrador."}
            {sinAcceso.motivo === "sin-municipio" && "Tu cuenta no está asignada a ningún municipio."}
            {sinAcceso.motivo === "error-config" && `No se pudo leer la configuración del municipio: ${sinAcceso.detalle}`}
          </span>
          {sinAcceso.motivo !== "error-config" && (
            <div className="acard flat" style={{ gap: 6 }}>
              <span className="s">Pídele al administrador que corra (desde backend/):</span>
              <code style={{ fontSize: 12, wordBreak: "break-all" }}>node seed/crear-funcionario.js {sinAcceso.email} --rol funcionario --municipio &lt;id&gt; --produccion</code>
              <span className="s">Después vuelve a entrar.</span>
            </div>
          )}
          <span className="muted" style={{ fontSize: 12 }}>{sinAcceso.email} · {sinAcceso.uid}</span>
          <button className="btn ghost" type="button" onClick={async () => { await salir(); router.replace("/login"); }}>Salir</button>
        </div>
      </div>
    );
  }

  if (!sesion) return null;
  return <Shell>{children}</Shell>;
}
