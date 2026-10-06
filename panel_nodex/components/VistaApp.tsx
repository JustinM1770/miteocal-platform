"use client";

import type { Timestamp } from "firebase/firestore";
import type { Modulo } from "@/lib/modulos";
import { haceTexto } from "@/lib/datos";
import Mapa from "@/components/Mapa";
import { deJSON } from "@/lib/mapas";

/* La pantalla de la app (Figma MiTeocal) donde cae cada módulo, con lo que
   ya está publicado y el borrador encima, marcado como «nuevo». */

export interface Item {
  id?: string;
  titulo: string;
  mensaje: string;
  colonia: string | null;
  datos: Record<string, string>;
  creadoEn: Date | Timestamp;
  nuevo?: boolean;
}

const COLOR_DE: Record<string, Record<string, string>> = {};
function colorDe(mod: Modulo, clave: string, valor?: string) {
  const c = mod.campos.find((x) => x.clave === clave);
  if (!c?.colores || !valor) return "gris";
  const k = `${mod.slug}.${clave}`;
  COLOR_DE[k] ??= Object.fromEntries(c.opciones!.map((o, i) => [o, c.colores![i]]));
  return COLOR_DE[k][valor] ?? "gris";
}

const dd = (s?: string) => (s ? s.slice(8, 10) : "--");
const mmm = (s?: string) => (s ? new Date(`${s}T12:00`).toLocaleDateString("es-MX", { month: "short" }).replace(".", "").toUpperCase() : "---");
const larga = (s?: string) => (s ? new Date(`${s}T12:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long" }) : "");
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

function Cab({ t, s }: { t: string; s: string }) {
  return <div className="phone-head"><span className="back">‹</span><div><strong>{t}</strong><span>{s}</span></div></div>;
}

const borde = (i: Item) => (i.nuevo ? { borderColor: "var(--brand)", borderWidth: 2, borderStyle: "solid" as const } : undefined);
const Nuevo = ({ i }: { i: Item }) => (i.nuevo ? <span className="tag azul" style={{ alignSelf: "flex-start" }}>Nuevo</span> : null);

export default function VistaApp({ mod, items }: { mod: Modulo; items: Item[] }) {
  const l = items.slice(0, 4);
  const primero = l[0];

  switch (mod.tipo) {
    case "corte":
      return (
        <div className="phone">
          <Cab t="Agua" s={`${primero?.colonia ?? "Tu colonia"}`} />
          <span className="h">Cortes programados</span>
          {l.map((i, n) => (
            <div key={i.id ?? n} className="acard" style={{ flexDirection: "row", alignItems: "center", gap: 12, ...borde(i) }}>
              <div className="datebadge"><b>{dd(i.datos.fecha)}</b><small>{mmm(i.datos.fecha)}</small></div>
              <div className="col grow" style={{ gap: 2 }}>
                <span className="t" style={{ fontSize: 13 }}>{i.titulo || "Motivo del corte"}</span>
                <span className="s">{i.datos.horario || "Horario"}{i.colonia ? ` · ${i.colonia}` : ""}</span>
              </div>
            </div>
          ))}
          <div className="acard" style={{ background: "var(--warn-soft)", borderColor: "transparent" }}>
            <span className="t" style={{ color: "var(--warn)", fontSize: 13 }}>⚠ Corte programado · {primero ? larga(primero.datos.fecha) : ""}</span>
            <span className="s">{primero?.mensaje || "El aviso aparece en la pantalla de inicio del vecino."}</span>
            <span className="tag gris" style={{ background: "#fff" }}>🔔 Recordármelo</span>
          </div>
        </div>
      );

    case "incidente": {
      const orden = [...l].sort((a, b) => (a.datos.hora ?? "").localeCompare(b.datos.hora ?? ""));
      return (
        <div className="phone">
          <Cab t="Agua" s={`${primero?.colonia ?? "Teocaltiche Centro"}`} />
          <div className="hero">
            <span className="k">ESTADO ACTUAL</span>
            <span className="v" style={{ fontSize: 22 }}>{primero?.titulo === "Restablecimiento" ? "Ya hay agua" : "Sin servicio"}</span>
            <span style={{ fontSize: 12, opacity: 0.85 }}>{primero?.mensaje}</span>
          </div>
          <span className="h">Qué ha pasado</span>
          <div className="timeline">
            {orden.map((i, n) => (
              <div key={i.id ?? n} className={`tl-row${i.nuevo ? " nuevo" : ""}`}>
                <span className="hora">{i.datos.hora ?? "--:--"}</span>
                <span className="rail"><i className={i.titulo === "Restablecimiento" ? "hueco" : ""} /></span>
                <div className="body col" style={{ gap: 2 }}>
                  <span className="t" style={{ fontWeight: 600, fontSize: 13 }}>{i.titulo || "Hito"}</span>
                  <span className="s" style={{ fontSize: 12, color: "var(--sec)" }}>{i.mensaje || "Qué pasó"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "basura": {
      const i = primero;
      const dias = (i?.datos.dias ?? "").split(",").filter(Boolean);
      let falta = "";
      if (i?.datos.hora) {
        const [h, m] = i.datos.hora.split(":").map(Number);
        const t = new Date(); t.setHours(h, m, 0, 0);
        const min = Math.round((+t - Date.now()) / 60000);
        falta = min > 0 && min < 180 ? `En ~${min} minutos` : `Llega ~${i.datos.hora}`;
      }
      return (
        <div className="phone">
          <Cab t="Camión de basura" s={i?.titulo || "Ruta · Unidad"} />
          <div className="mapa">
            {Array.from({ length: 9 }, (_, k) => <span key={k} />)}
            <span className="pin" style={{ top: 22, right: 30, background: "var(--ok)", color: "#fff" }}>Llega ~{i?.datos.hora || "--:--"}</span>
            <span className="pin" style={{ top: 70, left: 26 }}>Tu casa</span>
          </div>
          <div className="acard" style={borde(i ?? ({} as Item))}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="section-label">LLEGA A TU CALLE</span><span className="tag rojo">● EN VIVO</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{falta || "Elige la hora"}</span>
            <span className="s">{i?.mensaje || i?.colonia || ""}</span>
          </div>
          <div className="acard flat" style={{ flexDirection: "row", alignItems: "center", background: "var(--brand-soft)" }}>
            <div className="col grow"><span className="t" style={{ fontSize: 13 }}>Avísame 10 minutos antes</span><span className="s">Para que saques la basura a tiempo</span></div>
            <span className="toggle on" style={{ pointerEvents: "none" }}><span className="knob" /></span>
          </div>
          <span className="section-label">DÍAS DE RECOLECCIÓN EN TU CALLE</span>
          <div className="dias">{DIAS.map((d) => <span key={d} className={`dia${dias.includes(d) ? " on" : ""}`}>{d}</span>)}</div>
        </div>
      );
    }

    case "cierre":
      return (
        <div className="phone">
          <Cab t="Cierres y obras" s="A menos de 1 km de tu domicilio" />
          <MapaCierres mod={mod} items={l} />
          <div className="seg"><button className="on azul" type="button">Todos</button><button type="button">Cierres</button><button type="button">Obras</button></div>
          {l.map((i, n) => (
            <div key={i.id ?? n} className="acard" style={borde(i)}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className={`tag ${colorDe(mod, "categoria", i.datos.categoria)}`}>{i.datos.categoria || "Tipo"}</span>
                <span className="s">{i.colonia ?? ""}</span>
              </div>
              <span className="t">{i.datos.lugar || i.titulo || "Calle"}</span>
              <span className="s">{i.mensaje}</span>
              <span className="s">📅 {i.datos.hasta ? `Hasta el ${larga(i.datos.hasta)}` : `Desde el ${larga(i.datos.fecha)}`}</span>
              {i.datos.ruta && <span className="link">Ver ruta alterna ›</span>}
            </div>
          ))}
        </div>
      );

    case "escuela":
      return (
        <div className="phone">
          <Cab t="Escuelas" s="Avisos de los planteles que sigues" />
          <span className="section-label">AVISOS RECIENTES</span>
          {l.map((i, n) => (
            <div key={i.id ?? n} className="acard" style={borde(i)}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="t" style={{ fontSize: 13 }}>🎓 {i.datos.escuela || "Escuela"}</span>
                <span className="s">{i.nuevo ? "Ahora" : haceTexto(i.creadoEn)}</span>
              </div>
              <span className={`tag ${colorDe(mod, "categoria", i.datos.categoria)}`}>{i.datos.categoria || "Tipo de aviso"}</span>
              <span className="s">{i.mensaje || "Mensaje para los papás"}</span>
            </div>
          ))}
        </div>
      );

    case "noticia":
      return (
        <div className="phone">
          <div><strong style={{ fontSize: 18 }}>Noticias</strong><div className="s" style={{ fontSize: 11, color: "var(--sec)" }}>Lo que pasa en el municipio</div></div>
          <div className="seg"><button className="on azul" type="button">Todas</button><button type="button">Obras</button><button type="button">Salud</button></div>
          {l.slice(0, 3).map((i, n) => {
            const c = colorDe(mod, "categoria", i.datos.categoria);
            return (
              <div key={i.id ?? n} className="acard" style={{ overflow: "hidden", ...borde(i) }}>
                <div className="img-ph" style={{ background: i.datos.imagen ? `center/cover url(${i.datos.imagen})` : `var(--${c === "azul" ? "brand" : c === "verde" ? "ok" : c === "morado" ? "internal" : c === "rojo" ? "danger" : "border"}-soft, var(--subtle))` }} />
                <span className={`tag ${c}`}>{(i.datos.categoria || "Categoría").toUpperCase()}</span>
                <span className="t">{i.titulo || "Titular de la nota"}</span>
                <span className="s">{i.nuevo ? "Ahora" : haceTexto(i.creadoEn)}{i.datos.fuente ? ` · ${i.datos.fuente}` : ""}</span>
              </div>
            );
          })}
        </div>
      );

    case "parroquia":
      return (
        <div className="phone">
          <span className="h">Avisos parroquiales</span>
          {l.map((i, n) => (
            <div key={i.id ?? n} className="acard flat" style={{ flexDirection: "row", alignItems: "center", gap: 10, ...borde(i) }}>
              <span className="icon-sq" style={{ background: "#fff" }}>✝</span>
              <div className="col" style={{ gap: 2 }}>
                <span className="t" style={{ fontSize: 13 }}>{i.titulo || "Aviso"}{i.datos.hora ? ` · ${i.datos.hora} hrs` : ""}</span>
                <span className="s">{i.datos.templo || "Templo"}</span>
              </div>
            </div>
          ))}
        </div>
      );

    case "esquela":
      return (
        <div className="phone">
          <div className="row" style={{ justifyContent: "space-between" }}><span className="h">Esquelas</span></div>
          {l.map((i, n) => (
            <div key={i.id ?? n} className="acard" style={borde(i)}>
              <span className="t">{i.titulo || "Nombre completo"}</span>
              <span className="s">Falleció el {larga(i.datos.fallecio) || "—"}</span>
              <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
              <span className="t" style={{ fontSize: 12 }}>{i.mensaje || "Misa"}{i.datos.hora ? ` · ${larga(i.datos.fecha)}, ${i.datos.hora} hrs` : ""}</span>
              <span className="s">{i.datos.lugar || "Lugar"}</span>
            </div>
          ))}
        </div>
      );

    case "vacante":
      return (
        <div className="phone">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}><span className="h">Bolsa de trabajo</span><span className="link" style={{ color: "var(--brand)", fontSize: 12, fontWeight: 600 }}>Publicar vacante</span></div>
          {l.map((i, n) => (
            <div key={i.id ?? n} className="acard" style={borde(i)}>
              <span className="t">{i.titulo || "Puesto"}</span>
              <span className="s">{i.datos.negocio || "Negocio"}</span>
              <div className="row" style={{ gap: 6 }}>
                {i.datos.categoria && <span className="tag gris">{i.datos.categoria}</span>}
                {i.datos.salario && <span className="tag azul">{i.datos.salario}</span>}
              </div>
            </div>
          ))}
        </div>
      );

    case "clasificado": {
      const ico: Record<string, string> = { "Vehículo": "🚗", "Inmueble": "🏠", "Servicio": "🛠", "Otro": "📦" };
      return (
        <div className="phone">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}><span className="h">Clasificados</span><span style={{ color: "var(--brand)", fontSize: 12, fontWeight: 600 }}>Publicar gratis</span></div>
          {l.map((i, n) => (
            <div key={i.id ?? n} className="acard" style={{ flexDirection: "row", gap: 12, alignItems: "center", ...borde(i) }}>
              <span className="icon-sq" style={{ width: 48, height: 48, flex: "0 0 48px" }}>{ico[i.datos.categoria] ?? "📦"}</span>
              <div className="col" style={{ gap: 2 }}>
                <span className="t" style={{ fontSize: 13 }}>{i.titulo || "Título"}</span>
                {i.datos.precio && <span className="precio">{i.datos.precio}</span>}
                <span className="s">{i.datos.categoria || "Categoría"} · {i.nuevo ? "Ahora" : haceTexto(i.creadoEn)}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    case "paisanos":
      return (
        <div className="phone">
          <Cab t="Paisanos" s="Hijos Ausentes" />
          <span className="h">Trámites a distancia</span>
          {l.map((i, n) => (
            <div key={i.id ?? n} className="acard" style={{ flexDirection: "row", alignItems: "center", gap: 10, ...borde(i) }}>
              <span className="icon-sq" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>▤</span>
              <div className="col grow" style={{ gap: 2 }}>
                <span className="t" style={{ fontSize: 13 }}>{i.titulo || "Trámite"}</span>
                <span className="s">{(i.mensaje || "Cómo se hace").slice(0, 60)}</span>
              </div>
              <span className="muted">›</span>
            </div>
          ))}
        </div>
      );

    case "contacto":
      return (
        <div className="phone">
          <div><span className="h">Directorio de emergencia</span><div className="s" style={{ fontSize: 11, color: "var(--sec)" }}>Un toque para marcar</div></div>
          <div className="grid2">
            {l.map((i, n) => {
              const c = colorDe(mod, "categoria", i.datos.categoria);
              return (
                <div key={i.id ?? n} className="acard" style={borde(i)}>
                  <span className={`tag ${c}`} style={{ width: 30, height: 30, justifyContent: "center", alignItems: "center", borderRadius: 8 }}>✆</span>
                  <span className="t" style={{ fontSize: 13 }}>{i.titulo || "Nombre"}</span>
                  <span className="s">{i.datos.telefono || "Toca para marcar"}</span>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "aviso_interno":
      return (
        <div className="col" style={{ gap: 10 }}>
          {l.map((i, n) => (
            <div key={i.id ?? n} className="card col" style={{ gap: 6, padding: 14, borderLeft: `4px solid var(--${i.datos.prioridad === "Urgente" ? "danger" : "internal"})`, ...borde(i) }}>
              <div className="row" style={{ gap: 6 }}>
                <span className="tag morado">Para: {i.datos.area || "—"}</span>
                {i.datos.prioridad === "Urgente" && <span className="tag rojo">Urgente</span>}
                <Nuevo i={i} />
              </div>
              <strong>{i.titulo || "Asunto"}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{i.mensaje}</span>
            </div>
          ))}
        </div>
      );

    case "dependencia":
      return (
        <div className="card col" style={{ gap: 0, padding: "6px 14px" }}>
          {l.map((i, n) => (
            <div key={i.id ?? n} className="list-row" style={i.nuevo ? { background: "var(--brand-soft)" } : undefined}>
              <span className="icon-sq">🏛</span>
              <div className="col grow"><strong style={{ fontSize: 13 }}>{i.titulo || "Dependencia"}</strong><span className="muted" style={{ fontSize: 12 }}>{i.mensaje}</span></div>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{i.datos.telefono}</span>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

function MapaCierres({ mod, items }: { mod: Modulo; items: Item[] }) {
  const tramos = items.map((i, n) => ({ id: i.id ?? `n${n}`, puntos: deJSON(i.datos.trazo), color: colorDe(mod, "categoria", i.datos.categoria) === "naranja" ? "#c77700" : "#d93a3a", ancho: i.nuevo ? 7 : 5 }))
    .filter((t) => t.puntos.length > 1);
  const clave = tramos.map((t) => `${t.id}:${t.puntos.length}`).join("|");
  return <Mapa alto={170} zoom={14} lineas={tramos} ajustar={{ clave, puntos: tramos.flatMap((t) => t.puntos) }} />;
}
