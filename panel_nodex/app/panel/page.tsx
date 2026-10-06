"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import ModalCorregir from "@/components/ModalCorregir";
import {
  actividadReciente, ETIQUETA_ESTADO, haceTexto, horasDesde, metricas,
  publicar, reportesPorAtender, ultimaDeTipo, type Auditoria, type Publicacion,
} from "@/lib/datos";

/** A partir de aquí la app deja de mostrar el dato y dice «sin información» */
const CADUCIDAD_HORAS = 24;

export default function Escritorio() {
  const { sesion } = useAuth();
  const router = useRouter();

  const [agua, setAgua] = useState<Publicacion | null>(null);
  const [corte, setCorte] = useState<Publicacion | null>(null);
  const [audit, setAudit] = useState<Auditoria[]>([]);
  const [nums, setNums] = useState({ vecinos: 0, publicaciones: 0, notificaciones: 0 });
  const [pendientes, setPendientes] = useState(0);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const [a, c, ac, m, r] = await Promise.all([
      ultimaDeTipo("agua", "Teocaltiche Centro"),
      ultimaDeTipo("corte", "Teocaltiche Centro"),
      actividadReciente(5),
      metricas(),
      reportesPorAtender(),
    ]);
    setAgua(a); setCorte(c); setAudit(ac); setNums(m); setPendientes(r); setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const horas = horasDesde(agua?.creadoEn);
  const vencido = horas !== null && horas >= 12;
  const restantes = horas === null ? 0 : Math.max(0, CADUCIDAD_HORAS - horas);

  if (cargando) return <div className="muted">Cargando lo que ven los ciudadanos…</div>;

  return (
    <>
      {vencido && agua && (
        <div className="banner warn">
          <div className="col" style={{ gap: 3 }}>
            <strong>
              El estado del agua de {agua.colonia} lleva {horas} horas sin actualizarse
            </strong>
            <span className="muted">
              {restantes > 0
                ? `Los vecinos están viendo un dato viejo. La app lo marcará como «sin información» en ${restantes} horas.`
                : "La app ya lo está mostrando como «sin información actualizada»."}
            </span>
          </div>
          <button className="btn warn" onClick={() => router.push("/panel/agua")} type="button">
            Actualizar ahora
          </button>
        </div>
      )}

      <div className="section-label">LO QUE LOS CIUDADANOS ESTÁN VIENDO AHORA</div>

      <div className="row">
        <div className="card grow col" style={{ gap: 12 }}>
          {agua ? (
            <>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="h3">{agua.titulo}</h3>
                <span className={`pill ${agua.estado ?? "sin_dato"}`}>
                  {ETIQUETA_ESTADO[agua.estado ?? "sin_dato"].toUpperCase()}
                </span>
              </div>
              <p className="big">
                {agua.estado === "sin_servicio"
                  ? agua.horaEstimada ? `Vuelve hoy ~${agua.horaEstimada}` : "Sin estimación de regreso"
                  : agua.estado === "activo" ? "El servicio está funcionando"
                  : "Sin información del pozo"}
              </p>
              <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>
                Publicado {haceTexto(agua.creadoEn)} por {agua.autorNombre}
              </span>
              <div className="row" style={{ gap: 10, paddingTop: 4 }}>
                <button className="btn primary" onClick={() => router.push("/panel/agua")} type="button">
                  Actualizar estado
                </button>
                <button className="btn ghost" onClick={() => setCorrigiendo(true)} type="button">
                  Corregir dato publicado
                </button>
              </div>
            </>
          ) : (
            <div className="col" style={{ gap: 12, padding: "20px 0", alignItems: "flex-start" }}>
              <h3 className="h3">Todavía no has publicado nada</h3>
              <span className="muted">
                Mientras no publiques, la app muestra «sin información actualizada» en lugar de inventar un dato.
              </span>
              <button className="btn primary" onClick={() => router.push("/panel/agua")} type="button">
                Publicar el primer estado
              </button>
            </div>
          )}
        </div>

        <div className="card col" style={{ gap: 10, width: 400, flex: "0 0 400px" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="h3">Corte programado</h3>
            {corte && <span className="pill programado">PROGRAMADO</span>}
          </div>
          {corte ? (
            <>
              <strong style={{ fontWeight: 500 }}>{corte.titulo}</strong>
              <span className="muted">{corte.mensaje}</span>
            </>
          ) : (
            <span className="muted">No hay cortes programados para esta colonia.</span>
          )}
          <button className="btn ghost" style={{ alignSelf: "flex-start", padding: "8px 12px" }}
            onClick={() => router.push("/panel/cortes")} type="button">
            Programar corte
          </button>
        </div>
      </div>

      <div className="row">
        {[
          { n: nums.vecinos, t: "Vecinos con la app", s: "Teocaltiche Centro" },
          { n: nums.publicaciones, t: "Publicaciones esta semana", s: "en los últimos 7 días" },
          { n: nums.notificaciones, t: "Notificaciones enviadas", s: "en los últimos 7 días" },
          { n: pendientes, t: "Reportes por atender", s: "de los vecinos", href: "/panel/reportes" },
        ].map((m) => (
          <div className="card metric col" key={m.t}
            style={{ gap: 2, cursor: "href" in m ? "pointer" : undefined }}
            onClick={() => "href" in m && m.href && router.push(m.href)}>
            <span className="n">{m.n}</span>
            <span style={{ fontWeight: 500 }}>{m.t}</span>
            <span className="muted" style={{ fontSize: 11 }}>{m.s}</span>
          </div>
        ))}
      </div>

      <div className="card col" style={{ gap: 0, paddingBottom: 8 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", paddingBottom: 12 }}>
          <h3 className="h3">Actividad reciente</h3>
          <button type="button" onClick={() => router.push("/panel/auditoria")}
            style={{ color: "var(--brand)", fontWeight: 600, fontSize: 13, background: "none", border: "none", padding: 0 }}>
            Ver bitácora completa
          </button>
        </div>
        {audit.length === 0 && <span className="muted" style={{ paddingBottom: 12 }}>Sin movimientos todavía.</span>}
        {audit.map((a, i) => (
          <div className="list-row" key={a.id ?? i}>
            <span className="muted" style={{ width: 70, fontSize: 12, flex: "0 0 70px" }}>{haceTexto(a.creadoEn)}</span>
            <strong style={{ width: 90, flex: "0 0 90px", fontSize: 13 }}>{a.autorNombre}</strong>
            <span className="muted grow" style={{ fontSize: 13 }}>{a.accion} · {a.detalle}</span>
            <span className={`pill ${a.canal}`}>{a.canal === "interno" ? "INTERNO" : "PÚBLICO"}</span>
          </div>
        ))}
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
            }, "Corrigió el dato publicado");
            setCorrigiendo(false);
            await cargar();
          }}
        />
      )}
    </>
  );
}
