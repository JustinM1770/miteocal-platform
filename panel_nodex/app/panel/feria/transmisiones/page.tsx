"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { f } from "@/lib/almacen";
import {
  cambiarTransmision, guardarTransmision, listarEventos, listarTransmisiones,
  type Evento, type EstadoTransmision, type Transmision,
} from "@/lib/feria";

const ESTADO: Record<EstadoTransmision, { t: string; pill: string }> = {
  en_vivo: { t: "● EN VIVO", pill: "sin_servicio" },
  programada: { t: "PROGRAMADA", pill: "programado" },
  terminada: { t: "TERMINADA", pill: "sin_dato" },
};

export default function Transmisiones() {
  const { sesion } = useAuth();
  const [lista, setLista] = useState<Transmision[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [nueva, setNueva] = useState(false);

  const cargar = useCallback(async () => {
    const [t, e] = await Promise.all([listarTransmisiones(), listarEventos()]);
    setLista([...t]); setEventos(e);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  // El contador de espectadores lo manda el reproductor; en demo se simula
  useEffect(() => {
    const id = setInterval(() => {
      setLista((l) => l.map((t) => {
        if (t.estado !== "en_vivo") return t;
        const n = Math.max(0, t.espectadores + Math.round((Math.random() - 0.4) * 12));
        return { ...t, espectadores: n, pico: Math.max(t.pico, n) };
      }));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const orden: EstadoTransmision[] = ["en_vivo", "programada", "terminada"];
  const ordenada = [...lista].sort((a, b) => orden.indexOf(a.estado) - orden.indexOf(b.estado) || +f(a.inicio) - +f(b.inicio));
  const enVivo = lista.find((t) => t.estado === "en_vivo");

  return (
    <div className="row">
      <div className="col grow" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 13 }}>
            La transmisión se hace en YouTube o Facebook; la app la muestra dentro de MiTeocal y avisa a los paisanos.
          </span>
          <button className="btn primary" type="button" style={{ flex: "0 0 auto" }} onClick={() => setNueva(true)}>Programar transmisión</button>
        </div>
        {ordenada.map((t) => {
          const ev = eventos.find((e) => e.id === t.eventoId);
          return (
            <div key={t.id} className="card row" style={{ alignItems: "center", gap: 16, borderColor: t.estado === "en_vivo" ? "var(--danger)" : undefined }}>
              <div style={{ width: 120, height: 68, flex: "0 0 120px", borderRadius: 10, background: "var(--ink)", display: "grid", placeItems: "center", color: "#fff", fontSize: 20 }}>▶</div>
              <div className="col grow" style={{ gap: 4 }}>
                <span className={`pill ${ESTADO[t.estado].pill}`} style={{ alignSelf: "flex-start" }}>{ESTADO[t.estado].t}</span>
                <strong>{t.titulo}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {f(t.inicio).toLocaleString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {ev ? ` · ${ev.escenario}` : ""} · {t.url.replace(/^https?:\/\//, "")}
                </span>
              </div>
              <div className="col" style={{ alignItems: "flex-end", gap: 2, width: 130 }}>
                {t.estado === "en_vivo" && <><strong style={{ fontSize: 22 }}>{t.espectadores}</strong><span className="muted" style={{ fontSize: 11 }}>viendo ahora · pico {t.pico}</span></>}
                {t.estado === "terminada" && <><strong style={{ fontSize: 18 }}>{t.pico}</strong><span className="muted" style={{ fontSize: 11 }}>pico de espectadores</span></>}
              </div>
              {t.estado === "programada" && (
                <button className="btn primary" type="button" disabled={Boolean(enVivo)} title={enVivo ? "Ya hay una transmisión en vivo" : undefined}
                  onClick={async () => { await cambiarTransmision(t, "en_vivo", sesion!.nombre); await cargar(); }}>Iniciar</button>
              )}
              {t.estado === "en_vivo" && (
                <button className="btn ghost" type="button" style={{ color: "var(--danger)" }}
                  onClick={async () => { await cambiarTransmision(t, "terminada", sesion!.nombre); await cargar(); }}>Terminar</button>
              )}
            </div>
          );
        })}
      </div>

      <div className="col" style={{ width: 340, flex: "0 0 340px", gap: 10 }}>
        <span className="section-label">ASÍ SE VE EN LA APP</span>
        <div className="phone">
          <div className="phone-head"><span className="back">‹</span><div><strong>Paisanos</strong><span>Hijos Ausentes</span></div></div>
          {enVivo ? (
            <div className="acard" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ height: 150, background: "var(--ink)", position: "relative", display: "grid", placeItems: "center" }}>
                <span className="pill" style={{ position: "absolute", top: 10, left: 10, background: "var(--danger)", color: "#fff" }}>● EN VIVO</span>
                <span style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center" }}>▶</span>
              </div>
              <div className="col" style={{ padding: "10px 12px", gap: 2 }}>
                <span className="t">{enVivo.titulo}</span>
                <span className="s">{enVivo.espectadores} personas viendo</span>
              </div>
            </div>
          ) : (
            <div className="acard flat"><span className="s">No hay transmisión en vivo. La próxima aparece aquí con un botón «Recordarme».</span></div>
          )}
          <span className="h">Próximas</span>
          {lista.filter((t) => t.estado === "programada").slice(0, 3).map((t) => (
            <div key={t.id} className="acard row" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <div className="col grow" style={{ gap: 2 }}>
                <span className="t" style={{ fontSize: 13 }}>{t.titulo}</span>
                <span className="s">{f(t.inicio).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <span className="tag azul">Recordarme</span>
            </div>
          ))}
        </div>
      </div>

      {nueva && (
        <NuevaTransmision eventos={eventos} onCerrar={() => setNueva(false)}
          onGuardar={async (t) => { await guardarTransmision(t, sesion!.nombre); setNueva(false); await cargar(); }} />
      )}
    </div>
  );
}

function NuevaTransmision({ eventos, onCerrar, onGuardar }: {
  eventos: Evento[]; onCerrar: () => void; onGuardar: (t: Omit<Transmision, "id">) => Promise<void>;
}) {
  const [eventoId, setEventoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [inicio, setInicio] = useState("");
  const urlValida = /^https:\/\/(www\.)?(youtube\.com|youtu\.be|facebook\.com)\//.test(url);

  function elegirEvento(id: string) {
    setEventoId(id);
    const e = eventos.find((x) => x.id === id);
    if (e) { setTitulo(e.titulo); setInicio(`${e.fecha}T${e.hora}`); }
  }

  return (
    <div className="scrim" onClick={onCerrar}>
      <div className="modal col" style={{ width: 520, gap: 14 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Programar transmisión</h3>
        <div className="field"><label className="section-label">EVENTO DEL PROGRAMA · OPCIONAL</label>
          <select className="select" value={eventoId} onChange={(e) => elegirEvento(e.target.value)}>
            <option value="">Sin evento (misa, sesión de cabildo…)</option>
            {eventos.map((e) => <option key={e.id} value={e.id}>{e.titulo} · {e.fecha}</option>)}
          </select></div>
        <div className="field"><label className="section-label">TÍTULO</label>
          <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Quema del Castillo" /></div>
        <div className="field"><label className="section-label">ENLACE DE YOUTUBE O FACEBOOK LIVE</label>
          <input className={`input${url && !urlValida ? " error" : ""}`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/live/…" />
          {url && !urlValida && <span style={{ color: "var(--danger)", fontSize: 12 }}>Usa un enlace https de YouTube o Facebook.</span>}</div>
        <div className="field"><label className="section-label">INICIA</label>
          <input className="input" type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
        <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
          <button className="btn ghost" type="button" onClick={onCerrar}>Cancelar</button>
          <button className="btn primary" type="button" disabled={!titulo.trim() || !urlValida || !inicio}
            onClick={() => onGuardar({ titulo: titulo.trim(), eventoId: eventoId || null, url, estado: "programada", inicio: new Date(inicio), espectadores: 0, pico: 0 })}>
            Programar
          </button>
        </div>
      </div>
    </div>
  );
}
