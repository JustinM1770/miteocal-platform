"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { esAdmin, useAuth } from "@/lib/auth";
import ModalCorregir from "@/components/ModalCorregir";
import {
  ETIQUETA_ESTADO, actividadReciente, aguaDeHoy, haceTexto, horasDesde, listarReportes, metricas, programadas,
  publicar, ultimaDeTipo, type Auditoria, type Publicacion, type Reporte,
} from "@/lib/datos";
import { cfg, moduloActivo } from "@/lib/config";
import { f } from "@/lib/almacen";
import { listarSolicitudes } from "@/lib/tramites";
import Icono, { Burbuja, type NombreIcono } from "@/components/Icono";
import { abierto, urgenciaDe } from "@/lib/centro";

/** A partir de aquí la app deja de mostrar el dato y dice «sin información» */
const CADUCIDAD_HORAS = 24;

interface Resumen {
  agua: Publicacion | null;
  coloniasSinAgua: string[];
  corte: Publicacion | null;
  audit: Auditoria[];
  nums: { vecinos: number | null; publicaciones: number; notificaciones: number };
  reportes: Reporte[] | null;
  solicitudes: number | null;
  pendientes: Publicacion[];
}

/** Una tarjeta que falla (permiso, red) no tumba todo el escritorio */
const o = <T,>(p: Promise<T>, def: T) => p.catch(() => def);

export default function Escritorio() {
  const { sesion } = useAuth();
  const router = useRouter();
  const [r, setR] = useState<Resumen | null>(null);
  const [corrigiendo, setCorrigiendo] = useState(false);

  const cargar = useCallback(async () => {
    const [agua, hoy, corte, audit, nums, reportes, sols, pendientes] = await Promise.all([
      o(ultimaDeTipo("agua"), null),
      o(aguaDeHoy(), null),
      o(ultimaDeTipo("corte"), null),
      o(actividadReciente(6), []),
      o(metricas(), { vecinos: null, publicaciones: 0, notificaciones: 0 }),
      moduloActivo("reportes") ? o(listarReportes(300), null) : Promise.resolve(null),
      moduloActivo("tramites") ? o(listarSolicitudes(), null) : Promise.resolve(null),
      o(programadas(3), []),
    ]);
    setR({
      agua, corte, audit, nums, reportes, pendientes,
      coloniasSinAgua: Object.entries(hoy?.colonias ?? {}).filter(([, v]) => v.estado === "sin-servicio").map(([k]) => k),
      solicitudes: sols ? sols.filter((s) => s.estado === "recibida").length : null,
    });
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (!r) return <div className="muted">Cargando lo que ven los ciudadanos…</div>;

  const { agua } = r;
  const horas = horasDesde(agua?.publicarEn);
  const vencido = horas !== null && horas >= 12;
  const restantes = horas === null ? 0 : Math.max(0, CADUCIDAD_HORAS - horas);
  const faltan = cfg().faltantes;
  const abiertos = (r.reportes ?? []).filter(abierto);
  const urgentes = abiertos.filter((x) => urgenciaDe(x) === "alta").length;
  const puntos = miniMapa(abiertos);

  return (
    <>
      {esAdmin(sesion) && faltan.length > 0 && (
        <div className="banner warn">
          <div className="col" style={{ gap: 3 }}>
            <strong>Falta configurar el municipio: {faltan.join(", ")}</strong>
            <span className="muted">Sin colonias o sin fechas de feria, varias pantallas se quedan vacías.</span>
          </div>
          <button className="btn warn" type="button" onClick={() => router.push("/panel/municipio")}>Configurar</button>
        </div>
      )}

      {cfg().leySeca.activa && (
        <div className="banner" style={{ background: "var(--danger-soft)" }}>
          <span><strong style={{ color: "var(--danger)" }}>Ley seca activa</strong> <span className="muted">· {cfg().leySeca.motivo}. La app oculta la venta de alcohol.</span></span>
          <button className="btn ghost" type="button" onClick={() => router.push("/panel/comercios")}>Ver</button>
        </div>
      )}

      {moduloActivo("agua") && vencido && agua && (
        <div className="banner warn">
          <div className="col" style={{ gap: 3 }}>
            <strong>El estado del agua de {agua.colonia ?? "todo el municipio"} lleva {horas} horas sin actualizarse</strong>
            <span className="muted">
              {restantes > 0
                ? `Los vecinos están viendo un dato viejo. La app lo marcará como «sin información» en ${restantes} horas.`
                : "La app ya lo está mostrando como «sin información actualizada»."}
            </span>
          </div>
          <button className="btn warn" onClick={() => router.push("/panel/agua")} type="button">Actualizar ahora</button>
        </div>
      )}

      <div className="bento-fila">
        {moduloActivo("agua") && (
          <div className="hero-agua">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span className="k">Lo que ven los vecinos · Agua</span>
              {agua && (
                <span className="row" style={{ gap: 7, alignItems: "center", fontSize: 13, fontWeight: 500 }}>
                  <span className="punto" style={{ background: agua.estado === "activo" ? "#30a46c" : agua.estado === "sin_servicio" ? "#ff5a5a" : "#8a8f98" }} />
                  {ETIQUETA_ESTADO[agua.estado ?? "sin_dato"]} · {agua.colonia ?? "Todo el municipio"}
                </span>
              )}
            </div>
            {agua ? (
              <>
                <p className="v">
                  {agua.estado === "sin_servicio"
                    ? agua.horaEstimada ? `Vuelve hoy ~${agua.horaEstimada}` : "Sin estimación de regreso"
                    : agua.estado === "activo" ? "Servicio funcionando"
                    : "Sin información del pozo"}
                </p>
                {agua.mensaje && <p className="m">{agua.mensaje}</p>}
                {r.coloniasSinAgua.length > 0 && <p className="m">Sin servicio hoy: {r.coloniasSinAgua.join(", ")}</p>}
                <div className="row" style={{ gap: 10, alignItems: "center", marginTop: "auto", paddingTop: 6 }}>
                  <button className="btn primary" onClick={() => router.push("/panel/agua")} type="button">Actualizar estado <Icono n="flecha" tam={14} grosor={2} /></button>
                  <button className="btn oscuro" onClick={() => setCorrigiendo(true)} type="button">Corregir dato publicado</button>
                  <span className="grow" />
                  <span style={{ fontSize: 13, opacity: 0.45 }}>Publicado {haceTexto(agua.publicarEn)}</span>
                </div>
              </>
            ) : (
              <>
                <p className="v" style={{ fontSize: 34 }}>Todavía no publicas el estado del agua</p>
                <p className="m">Mientras no publiques, la app muestra «sin información actualizada» en lugar de inventar un dato.</p>
                <div className="row" style={{ marginTop: "auto" }}>
                  <button className="btn primary" onClick={() => router.push("/panel/agua")} type="button">Publicar el primer estado <Icono n="flecha" tam={14} grosor={2} /></button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="bento-lado">
          <button type="button" className="card col" style={{ gap: 6, flex: 1, textAlign: "left", border: "none", font: "inherit", color: "inherit" }} onClick={() => router.push("/panel/cortes")}>
            <div className="tarjeta-top"><Burbuja n="calendario" tam={44} /><Icono n="flecha" tam={16} /></div>
            <span style={{ flex: 1, minHeight: 18 }} />
            <span className="section-label">Corte programado</span>
            {r.corte ? (
              <>
                <span className="big">{diaCorto(r.corte.datos?.fecha) ?? r.corte.titulo}</span>
                <span className="muted" style={{ fontSize: 14 }}>
                  {[r.corte.datos?.horario, r.corte.datos?.fecha ? r.corte.titulo : r.corte.mensaje].filter(Boolean).join(" · ")}
                </span>
              </>
            ) : <span className="big" style={{ fontSize: 26 }}>Sin cortes</span>}
            <span className="btn ghost" style={{ alignSelf: "flex-start", marginTop: 8 }}>Programar corte</span>
          </button>
        </div>
      </div>

      <div className="bento-fila">
        <Indicador icono="personas" t="Vecinos con la app" n={r.nums.vecinos} s={r.nums.vecinos === null ? "Sin estadísticas todavía" : "en todo el municipio"} />
        {r.reportes !== null && (
          <Indicador icono="alerta" t="Reportes por atender" n={abiertos.length} rojo={urgentes > 0}
            s={urgentes === 1 ? "1 urgente" : urgentes > 0 ? `${urgentes} urgentes` : "ninguno urgente"} onClick={() => router.push("/panel/reportes")} />
        )}
        {r.solicitudes !== null && (
          <Indicador icono="documento" t="Trámites por revisar" n={r.solicitudes} rojo={r.solicitudes > 0}
            s="solicitudes nuevas" onClick={() => router.push("/panel/tramites")} />
        )}
        <Indicador icono="campana" t="Notificaciones" n={r.nums.notificaciones} s="Esta semana" />
      </div>

      <div className="bento-fila">
        <div className="card col" style={{ gap: 0, flex: 1, minWidth: 0, paddingBottom: 10 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", paddingBottom: 14 }}>
            <h3 className="h3" style={{ fontSize: 22 }}>Actividad reciente</h3>
            {esAdmin(sesion) && (
              <button type="button" onClick={() => router.push("/panel/auditoria")}
                style={{ color: "var(--sec)", fontWeight: 500, fontSize: 14, background: "none", border: "none", padding: 0 }}>
                Ver auditoría
              </button>
            )}
          </div>
          {r.audit.length === 0 && <span className="muted" style={{ paddingBottom: 12 }}>Sin movimientos todavía.</span>}
          {r.audit.map((a, i) => (
            <div className="mov" key={a.id ?? i}>
              <Burbuja n={iconoDe(a)} tam={38} />
              <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
                <span className="t">{a.accion} · {a.detalle}</span>
                <span className="s">{a.autorNombre} · {haceTexto(a.creadoEn)}</span>
              </div>
              <span className={`pill ${a.canal}`}>{a.canal === "interno" ? "Interno" : "Público"}</span>
            </div>
          ))}
        </div>

        <div className="bento-lado">
          {moduloActivo("reportes") && (
            <div className="card col" style={{ gap: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="h3" style={{ fontSize: 22 }}>Centro de mando</h3>
                <span className="row" style={{ gap: 6, alignItems: "center", color: "var(--brand)", fontSize: 13, fontWeight: 500 }}>
                  <span className="punto" style={{ background: "var(--brand)" }} /> En vivo
                </span>
              </div>
              <div className="mini-mapa" aria-hidden>
                {puntos.map((p, i) => <i key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.urgente ? "#e5484d" : "var(--ink)" }} />)}
                <span>Mapa 3D · Mapbox</span>
              </div>
              <button className="btn" style={{ background: "var(--ink)", color: "#fff", alignSelf: "flex-start" }} type="button" onClick={() => router.push("/panel/centro")}>
                Abrir centro de mando <Icono n="flecha" tam={14} grosor={2} />
              </button>
            </div>
          )}
          <div className="card col" style={{ gap: 12, flex: 1 }}>
            <h3 className="h3" style={{ fontSize: 22 }}>Programadas</h3>
            {r.pendientes.length === 0 && <span className="muted" style={{ fontSize: 13 }}>No hay publicaciones programadas.</span>}
            {r.pendientes.map((p) => (
              <div key={p.id} className="col" style={{ gap: 3 }}>
                <span className="section-label">{f(p.publicarEn).toLocaleString("es-MX", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <span style={{ fontSize: 15 }}>{p.titulo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {corrigiendo && agua && (
        <ModalCorregir
          actual={agua}
          onCancelar={() => setCorrigiendo(false)}
          onConfirmar={async ({ estado, horaEstimada, motivo, renotificar }) => {
            await publicar({
              tipo: "agua", canal: "publico", colonia: agua.colonia, estado,
              titulo: agua.titulo, mensaje: motivo, horaEstimada,
              publicarEn: new Date(),
              caducaEn: new Date(Date.now() + CADUCIDAD_HORAS * 3600_000),
              notificar: renotificar, alcance: agua.alcance,
              autorNombre: sesion!.nombre, autorUid: sesion!.uid,
            }, { accion: "Corrigió el dato publicado" });
            setCorrigiendo(false);
            await cargar();
          }}
        />
      )}
    </>
  );
}

/** "Mar 18" a partir de "2026-11-18" */
function diaCorto(fecha?: string) {
  if (!fecha) return null;
  const d = new Date(`${fecha}T12:00:00`);
  if (isNaN(+d)) return null;
  const dia = d.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "");
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d.getDate()}`;
}

/** 12.4k para cifras grandes */
const cifra = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString("es-MX"));

function Indicador({ icono, t, n, s, rojo, onClick }: { icono: NombreIcono; t: string; n: number | null; s: string; rojo?: boolean; onClick?: () => void }) {
  const Caja = onClick ? "button" : "div";
  return (
    <Caja type={onClick ? "button" : undefined} className="kpi-bento" onClick={onClick}>
      <div className="tarjeta-top"><Burbuja n={icono} tam={44} />{onClick && <Icono n="flecha" tam={16} />}</div>
      <span style={{ height: 30 }} />
      <span className="section-label">{t}</span>
      <span className="n">{n === null ? "—" : cifra(n)}</span>
      <span className="s">{rojo && <span className="punto" style={{ background: "#e5484d", width: 6, height: 6 }} />}{s}</span>
    </Caja>
  );
}

/** Ícono de cada movimiento según de qué trata */
function iconoDe(a: Auditoria): NombreIcono {
  const t = `${a.accion} ${a.detalle}`.toLowerCase();
  if (/agua|pozo|corte/.test(t)) return "gota";
  if (/reporte|fuga|bache/.test(t)) return "alerta";
  if (/feria|taquilla|boleto|evento/.test(t)) return "boleto";
  if (/acta|trámite|tramite|solicitud/.test(t)) return "documento";
  if (/vecino|usuario|personal/.test(t)) return "personas";
  return "periodico";
}

/** Reportes abiertos repartidos en el recuadro del mini mapa */
function miniMapa(rs: Reporte[]) {
  const con = rs.filter((x) => x.lat != null && x.lng != null).slice(0, 14);
  if (!con.length) return [];
  const lats = con.map((x) => x.lat!), lngs = con.map((x) => x.lng!);
  const [a, b, c, d] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  return con.map((x) => ({
    x: 10 + ((x.lng! - c) / (d - c || 1)) * 80,
    y: 12 + (1 - (x.lat! - a) / (b - a || 1)) * 62,
    urgente: urgenciaDe(x) === "alta",
  }));
}
