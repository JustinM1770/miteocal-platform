"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { esAdmin, useAuth } from "@/lib/auth";
import ModalCorregir from "@/components/ModalCorregir";
import { Kpi } from "@/components/graficas";
import {
  ETIQUETA_ESTADO, actividadReciente, aguaDeHoy, haceTexto, horasDesde, metricas, programadas,
  publicar, reportesPorAtender, ultimaDeTipo, type Auditoria, type Publicacion,
} from "@/lib/datos";
import { cfg, moduloActivo } from "@/lib/config";
import { f } from "@/lib/almacen";
import { listarSolicitudes } from "@/lib/tramites";
import { listarTransmisiones, type Transmision } from "@/lib/feria";

/** A partir de aquí la app deja de mostrar el dato y dice «sin información» */
const CADUCIDAD_HORAS = 24;

interface Resumen {
  agua: Publicacion | null;
  coloniasSinAgua: string[];
  corte: Publicacion | null;
  audit: Auditoria[];
  nums: { vecinos: number | null; publicaciones: number; notificaciones: number };
  reportes: number | null;
  solicitudes: number | null;
  enVivo: Transmision[];
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
    const [agua, hoy, corte, audit, nums, reportes, sols, trans, pendientes] = await Promise.all([
      o(ultimaDeTipo("agua"), null),
      o(aguaDeHoy(), null),
      o(ultimaDeTipo("corte"), null),
      o(actividadReciente(6), []),
      o(metricas(), { vecinos: null, publicaciones: 0, notificaciones: 0 }),
      moduloActivo("reportes") ? o(reportesPorAtender(), null) : Promise.resolve(null),
      moduloActivo("tramites") ? o(listarSolicitudes(), null) : Promise.resolve(null),
      moduloActivo("feria") || moduloActivo("paisanos") ? o(listarTransmisiones(), []) : Promise.resolve([]),
      o(programadas(5), []),
    ]);
    setR({
      agua, corte, audit, nums, reportes, pendientes,
      coloniasSinAgua: Object.entries(hoy?.colonias ?? {}).filter(([, v]) => v.estado === "sin-servicio").map(([k]) => k),
      solicitudes: sols ? sols.filter((s) => s.estado === "recibida").length : null,
      enVivo: trans.filter((t) => t.estado === "en_vivo"),
    });
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (!r) return <div className="muted">Cargando lo que ven los ciudadanos…</div>;

  const { agua } = r;
  const horas = horasDesde(agua?.publicarEn);
  const vencido = horas !== null && horas >= 12;
  const restantes = horas === null ? 0 : Math.max(0, CADUCIDAD_HORAS - horas);
  const faltan = cfg().faltantes;

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

      {r.enVivo.map((t) => (
        <div key={t.id} className="banner" style={{ background: "var(--danger-soft)" }}>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <span className="pill" style={{ background: "var(--danger)", color: "#fff" }}>● EN VIVO</span>
            <strong>{t.titulo}</strong>
          </div>
          <button className="btn ghost" type="button" onClick={() => router.push("/panel/feria/transmisiones")}>Ver</button>
        </div>
      ))}

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

      <div className="section-label">LO QUE LOS CIUDADANOS ESTÁN VIENDO AHORA</div>

      <div className="row">
        {moduloActivo("agua") && (
          <div className="card grow col" style={{ gap: 12 }}>
            {agua ? (
              <>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className="h3">{agua.titulo}</h3>
                  <span className={`pill ${agua.estado ?? "sin_dato"}`}>{ETIQUETA_ESTADO[agua.estado ?? "sin_dato"].toUpperCase()}</span>
                </div>
                <p className="big">
                  {agua.estado === "sin_servicio"
                    ? agua.horaEstimada ? `Vuelve hoy ~${agua.horaEstimada}` : "Sin estimación de regreso"
                    : agua.estado === "activo" ? "El servicio está funcionando"
                    : "Sin información del pozo"}
                </p>
                <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Publicado {haceTexto(agua.publicarEn)} por {agua.autorNombre}</span>
                {r.coloniasSinAgua.length > 0 && (
                  <span className="tag rojo">Sin servicio hoy: {r.coloniasSinAgua.join(", ")}</span>
                )}
                <div className="row" style={{ gap: 10, paddingTop: 4 }}>
                  <button className="btn primary" onClick={() => router.push("/panel/agua")} type="button">Actualizar estado</button>
                  <button className="btn ghost" onClick={() => setCorrigiendo(true)} type="button">Corregir dato publicado</button>
                </div>
              </>
            ) : (
              <div className="col" style={{ gap: 12, padding: "20px 0", alignItems: "flex-start" }}>
                <h3 className="h3">Todavía no has publicado el estado del agua</h3>
                <span className="muted">Mientras no publiques, la app muestra «sin información actualizada» en lugar de inventar un dato.</span>
                <button className="btn primary" onClick={() => router.push("/panel/agua")} type="button">Publicar el primer estado</button>
              </div>
            )}
          </div>
        )}

        <div className="card col" style={{ gap: 10, width: 400, flex: "0 0 400px" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="h3">Corte programado</h3>
            {r.corte && <span className="pill programado">PROGRAMADO</span>}
          </div>
          {r.corte ? (
            <>
              <strong style={{ fontWeight: 500 }}>{r.corte.titulo}</strong>
              <span className="muted">{r.corte.mensaje}</span>
            </>
          ) : <span className="muted">No hay cortes programados.</span>}
          <button className="btn ghost" style={{ alignSelf: "flex-start", padding: "8px 12px" }} onClick={() => router.push("/panel/cortes")} type="button">Programar corte</button>
        </div>
      </div>

      <div className="row">
        <Kpi n={r.nums.vecinos ?? "—"} t="Vecinos con la app" s={r.nums.vecinos === null ? "Falta config/estadisticas" : "en todo el municipio"} />
        <Kpi n={r.nums.publicaciones} t="Publicaciones esta semana" s="en los últimos 7 días" />
        <Kpi n={r.nums.notificaciones} t="Notificaciones enviadas" s="en los últimos 7 días" />
        {r.reportes !== null && <Kpi n={r.reportes} t="Reportes por atender" s="de los vecinos" onClick={() => router.push("/panel/reportes")} />}
        {r.solicitudes !== null && <Kpi n={r.solicitudes} t="Trámites por revisar" s="solicitudes nuevas" onClick={() => router.push("/panel/tramites")} />}
      </div>

      <div className="row">
        <div className="card grow col" style={{ gap: 0, paddingBottom: 8 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", paddingBottom: 12 }}>
            <h3 className="h3">Actividad reciente</h3>
            {esAdmin(sesion) && (
              <button type="button" onClick={() => router.push("/panel/auditoria")}
                style={{ color: "var(--brand)", fontWeight: 600, fontSize: 13, background: "none", border: "none", padding: 0 }}>
                Ver bitácora completa
              </button>
            )}
          </div>
          {r.audit.length === 0 && <span className="muted" style={{ paddingBottom: 12 }}>Sin movimientos todavía.</span>}
          {r.audit.map((a, i) => (
            <div className="list-row" key={a.id ?? i}>
              <span className="muted" style={{ width: 70, fontSize: 12, flex: "0 0 70px" }}>{haceTexto(a.creadoEn)}</span>
              <strong style={{ width: 90, flex: "0 0 90px", fontSize: 13 }}>{a.autorNombre}</strong>
              <span className="muted grow" style={{ fontSize: 13 }}>{a.accion} · {a.detalle}</span>
              <span className={`pill ${a.canal}`}>{a.canal === "interno" ? "INTERNO" : "PÚBLICO"}</span>
            </div>
          ))}
        </div>

        <div className="card col" style={{ gap: 8, width: 400, flex: "0 0 400px" }}>
          <h3 className="h3">Programadas</h3>
          <span className="muted" style={{ fontSize: 12 }}>Salen solas a su hora. Todavía no las ven los vecinos.</span>
          {r.pendientes.length === 0 && <span className="muted" style={{ fontSize: 13 }}>No hay publicaciones programadas.</span>}
          {r.pendientes.map((p) => (
            <div key={p.id} className="acard flat">
              <span className="t" style={{ fontSize: 13 }}>{p.titulo}</span>
              <span className="s">{f(p.publicarEn).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{p.notificar ? " · con notificación" : ""}</span>
            </div>
          ))}
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
