import { FERIA } from "@/lib/feria";

const d = (s: string) => new Date(`${s}T12:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long" });

export default function FeriaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="row" style={{ alignItems: "center", gap: 10 }}>
        <span className="pill programado">{FERIA.nombre.toUpperCase()}</span>
        <span className="muted" style={{ fontSize: 13 }}>{d(FERIA.inicio)} al {d(FERIA.fin)}</span>
      </div>
      {children}
    </>
  );
}
