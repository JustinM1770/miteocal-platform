"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { esAdmin, NOMBRE_ROL, useAuth } from "@/lib/auth";
import { cuentaDePrueba } from "@/lib/firebase";
import { cfg, moduloActivo } from "@/lib/config";
import { paginaDe, seccionesVisibles } from "@/lib/navegacion";
import Accesibilidad from "@/components/Accesibilidad";
import Icono, { type NombreIcono } from "@/components/Icono";

const ICONO_SECCION: Record<string, NombreIcono> = {
  Escritorio: "casa", "Centro de mando": "radar", Servicios: "llave", Comunidad: "periodico",
  Comercio: "bolsa", Feria: "boleto", Trámites: "documento", Vecinos: "personas",
  Interno: "candado", Administración: "ajustes",
};

const saludo = () => { const h = new Date().getHours(); return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"; };
const hoyLargo = () => new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

/** Mensaje entendible para los errores de Firebase más comunes */
function explicar(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const msg = (e as { message?: string })?.message ?? String(e);
  if (code === "permission-denied" || /insufficient permissions/i.test(msg)) return "No tienes permiso para ver o cambiar esto. Si crees que es un error, pide acceso al administrador.";
  if (code === "unavailable" || /offline|network/i.test(msg)) return "Sin conexión con el servidor. Revisa tu internet; los datos se actualizan al volver.";
  if (code === "failed-precondition" && /index/i.test(msg)) return "Falta un índice en Firestore. Hay que publicar firestore.indexes.json (ver README).";
  if (code === "unauthenticated") return "Tu sesión expiró. Vuelve a entrar.";
  return `Algo falló al cargar: ${msg}`;
}

/** Si una pantalla truena al dibujarse, se muestra esto en vez de una página en blanco */
class Respaldo extends Component<{ children: ReactNode; ruta: string }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) { return { error }; }
  componentDidUpdate(prev: { ruta: string }) { if (prev.ruta !== this.props.ruta && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card col" style={{ gap: 10, alignItems: "flex-start" }}>
        <h3 className="h3">Esta pantalla tuvo un problema</h3>
        <span className="muted">{explicar(this.state.error)}</span>
        <button className="btn ghost" type="button" onClick={() => this.setState({ error: null })}>Reintentar</button>
      </div>
    );
  }
}

export default function Shell({ children }: { children: ReactNode }) {
  const { sesion, salir } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);

  const admin = esAdmin(sesion);
  const secciones = seccionesVisibles(admin, moduloActivo);
  const actual = secciones.find((s) => s.paginas.some((p) => p.href === path)) ?? null;
  // Interno y Administración van abajo, separados del trabajo diario
  const principales = secciones.filter((s) => !s.interno && s.nombre !== "Administración");
  const abajo = secciones.filter((s) => s.interno || s.nombre === "Administración");
  const escritorio = path === "/panel";
  const pagina = paginaDe(path);
  // Una página puede estar en el código y no ser accesible: por rol o por módulo apagado
  const bloqueada = pagina && !actual ? (pagina.admin && !admin ? "admin" : "modulo") : null;

  // Cualquier carga que falle sin manejarse (permiso, red, índice) se avisa arriba,
  // en vez de dejar la pantalla en «Cargando…» para siempre
  useEffect(() => {
    const alFallar = (e: PromiseRejectionEvent) => { setFalla(explicar(e.reason)); };
    window.addEventListener("unhandledrejection", alFallar);
    return () => window.removeEventListener("unhandledrejection", alFallar);
  }, []);
  useEffect(() => { setFalla(null); setMenu(false); }, [path]);

  return (
    <div className="shell">
      <Accesibilidad />
      <aside className={`sidebar${menu ? " abierta" : ""}`} aria-label="Secciones">
        <div className="brand">
          <span className="logo" aria-hidden>N<i /></span>
          <div>
            <h1>Nodex</h1>
            <p>{cfg().nombre || "Panel del Ayuntamiento"}</p>
          </div>
        </div>

        {principales.map((s) => (
          <button key={s.nombre} type="button"
            className={`nav-item${actual === s ? " active" : ""}`}
            aria-current={actual === s ? "page" : undefined}
            onClick={() => router.push(s.paginas[0].href)}>
            <Icono n={ICONO_SECCION[s.nombre] ?? "documento"} tam={18} />
            {s.nombre}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        {abajo.map((s) => (
          <button key={s.nombre} type="button"
            className={`nav-item secundario${actual === s ? " active" : ""}`}
            aria-current={actual === s ? "page" : undefined}
            onClick={() => router.push(s.paginas[0].href)}>
            <Icono n={ICONO_SECCION[s.nombre] ?? "ajustes"} tam={18} />
            {s.nombre}
          </button>
        ))}
        <div className="usuario">
          <span className="burbuja" style={{ width: 34, height: 34, flex: "0 0 34px" }}><Icono n="personas" tam={16} /></span>
          <div className="col" style={{ minWidth: 0, flex: 1 }}>
            <strong>{sesion?.nombre ?? ""}</strong>
            <span>{sesion ? (sesion.area ? `${NOMBRE_ROL[sesion.rol]} · ${sesion.area}` : NOMBRE_ROL[sesion.rol]) : ""}</span>
          </div>
          <button type="button" className="icono-btn" aria-label="Salir" title="Salir"
            onClick={async () => { await salir(); router.push("/login"); }}>
            <Icono n="salir" tam={16} />
          </button>
        </div>
      </aside>
      {menu && <div className="sidebar-fondo" onClick={() => setMenu(false)} aria-hidden />}

      <div className="main">
        <header className="topbar">
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <button type="button" className="btn ghost hamburguesa" aria-label="Abrir menú" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>☰</button>
            <div className="col" style={{ gap: 2 }}>
              <span className="section-label">{escritorio ? hoyLargo() : actual?.nombre === "Escritorio" ? "" : cfg().nombre}</span>
              <h2 className={escritorio ? "saludo" : undefined}>{escritorio ? `${saludo()}, ${(sesion?.nombre ?? "").split(" ")[0]}` : actual?.nombre ?? "Panel"}</h2>
            </div>
          </div>
          <div className="right">
            {cuentaDePrueba && <span className="pill interno solo-escritorio">Cuenta de prueba</span>}
            <button type="button" className="buscador solo-escritorio" onClick={() => router.push("/panel/centro")}>
              <Icono n="buscar" tam={15} />
              <span>Buscar o dar una orden…</span>
              <kbd>⌘K</kbd>
            </button>
            <button type="button" className="icono-btn grande" aria-label="Avisos" onClick={() => router.push("/panel/auditoria")}>
              <Icono n="campana" tam={18} />
            </button>
          </div>
        </header>

        {actual && actual.paginas.length > 1 && (
          <nav className="tabs subnav" aria-label={actual.nombre}>
            {actual.paginas.map((p) => (
              <button key={p.href} type="button" className={p.href === path ? "on" : ""} aria-current={p.href === path ? "page" : undefined} onClick={() => router.push(p.href)}>
                {p.nombre}
              </button>
            ))}
          </nav>
        )}

        <main className="content">
          {falla && (
            <div className="banner" role="alert" style={{ background: "var(--danger-soft)" }}>
              <span style={{ color: "var(--danger)", fontWeight: 600 }}>{falla}</span>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" onClick={() => window.location.reload()}>Recargar</button>
                <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" onClick={() => setFalla(null)}>Cerrar</button>
              </div>
            </div>
          )}
          {bloqueada ? (
            <div className="card col" style={{ gap: 10, alignItems: "flex-start" }}>
              <h3 className="h3">{bloqueada === "admin" ? "Esta sección es solo para administradores" : "Este módulo no está activo en tu municipio"}</h3>
              <span className="muted">{bloqueada === "admin" ? "Contiene datos personales o la configuración del municipio." : "Lo puede encender el equipo de la plataforma."}</span>
              <button className="btn ghost" type="button" onClick={() => router.push("/panel")}>Ir al escritorio</button>
            </div>
          ) : (
            <Respaldo ruta={path}>{children}</Respaldo>
          )}
        </main>
      </div>
    </div>
  );
}
