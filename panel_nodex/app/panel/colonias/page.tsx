"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import Mapa, { type Globo, type Marcador } from "@/components/Mapa";
import { aguaDeHoy, listarReportes, registrar } from "@/lib/datos";
import { TIPOS_COLONIA, aSlug, alcanceDe, cfg, guardarConfig, type Colonia, type TipoColonia } from "@/lib/config";

const COLOR_TIPO: Record<TipoColonia, string> = { "Barrio tradicional": "#c77700", Colonia: "#1552e0", Fraccionamiento: "#6b3db8", Localidad: "#12a150" };

/* municipios/{id}/config/colonias — barrios, colonias, fraccionamientos y
   localidades. El centro (lat/lng) ubica los mapas y agrupa reportes; la
   zona y el tipo sirven para mandar avisos a un sector completo. */
export default function Colonias() {
  const { sesion } = useAuth();
  const [lista, setLista] = useState<Colonia[]>(() => cfg().colonias.map((c) => ({ ...c })));
  const [sel, setSel] = useState<number | null>(null);
  const [cambios, setCambios] = useState(false);
  const [estado, setEstado] = useState<"" | "guardando" | "listo" | "error">("");
  const [reportes, setReportes] = useState<Record<string, number>>({});
  const [sinAgua, setSinAgua] = useState<Set<string>>(new Set());
  const [ponerCentro, setPonerCentro] = useState(false);

  useEffect(() => {
    listarReportes().then((l) => {
      const m: Record<string, number> = {};
      for (const r of l) if (r.estado !== "resuelto") m[r.colonia] = (m[r.colonia] ?? 0) + 1;
      setReportes(m);
    }).catch(() => {});
    aguaDeHoy().then((a) => setSinAgua(new Set(Object.entries(a?.colonias ?? {}).filter(([, v]) => v.estado === "sin-servicio").map(([k]) => k)))).catch(() => {});
  }, []);

  const poner = (i: number, c: Partial<Colonia>) => { setLista((l) => l.map((x, k) => (k === i ? { ...x, ...c } : x))); setCambios(true); setEstado(""); };
  const nombres = lista.map((c) => c.nombre.trim().toLowerCase());
  const repetida = (n: string) => nombres.filter((x) => x === n.trim().toLowerCase()).length > 1;
  const valida = lista.every((c) => c.nombre.trim() && !repetida(c.nombre));
  const zonasUsadas = [...new Set(lista.map((c) => c.zona).filter(Boolean))] as string[];
  const actual = sel !== null ? lista[sel] : null;
  const conCentro = lista.filter((c) => typeof c.lat === "number" && typeof c.lng === "number");

  const marcadores = useMemo<Marcador[]>(() => lista.flatMap((c, i) => (typeof c.lat === "number" && typeof c.lng === "number"
    ? [{ id: `c${i}`, punto: { lng: c.lng, lat: c.lat }, color: COLOR_TIPO[c.tipo ?? "Colonia"], texto: sel === i ? "●" : "", onClick: () => { setSel(i); setPonerCentro(false); } }]
    : [])), [lista, sel]);
  const globo = useMemo<Globo | null>(() => (actual && typeof actual.lat === "number" && typeof actual.lng === "number"
    ? { punto: { lng: actual.lng, lat: actual.lat }, titulo: actual.nombre || "Sin nombre", lineas: [`${actual.tipo ?? "Colonia"} · ${actual.zona || "sin zona"}`, `${alcanceDe(actual.nombre) ?? "—"} vecinos · ${reportes[actual.nombre] ?? 0} reportes abiertos`] }
    : null), [actual, reportes]);

  function clicMapa(p: { lng: number; lat: number }) {
    if (sel !== null && ponerCentro) { poner(sel, { lat: +p.lat.toFixed(5), lng: +p.lng.toFixed(5) }); setPonerCentro(false); }
  }

  async function guardar() {
    setEstado("guardando");
    try {
      const limpia = lista.map((c) => ({ ...c, nombre: c.nombre.trim(), id: c.id || aSlug(c.nombre) }));
      await guardarConfig("colonias", limpia);
      await registrar("Actualizó colonias y barrios", `${limpia.length} registros`, "interno", sesion!.nombre);
      setCambios(false); setEstado("listo");
    } catch { setEstado("error"); }
  }

  return (
    <div className="row" style={{ alignItems: "stretch" }}>
      <div className="card col" style={{ width: 420, flex: "0 0 420px", gap: 10, maxHeight: "calc(100vh - 170px)", overflowY: "auto" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">Colonias y barrios · {lista.length}</h3>
            <span className="muted" style={{ fontSize: 12 }}>{conCentro.length} con centro en el mapa</span>
          </div>
          <button className="btn ghost" style={{ padding: "7px 10px" }} type="button"
            onClick={() => { setLista((l) => [...l, { id: "", nombre: "", zona: zonasUsadas[0] ?? "", tipo: "Colonia" }]); setSel(lista.length); setCambios(true); setPonerCentro(true); }}>+ Agregar</button>
        </div>

        {[...new Set(lista.map((c) => c.zona || "Sin zona"))].map((z) => (
          <div key={z} className="col" style={{ gap: 4 }}>
            <span className="section-label" style={{ paddingTop: 6 }}>{z.toUpperCase()}</span>
            {lista.map((c, i) => ((c.zona || "Sin zona") !== z ? null : (
              <button key={i} type="button" className="acard" onClick={() => { setSel(i); setPonerCentro(false); }}
                style={{ textAlign: "left", cursor: "pointer", borderColor: sel === i ? "var(--brand)" : undefined, borderWidth: sel === i ? 2 : 1, borderStyle: "solid" }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <span className="t" style={{ fontSize: 13 }}>{c.nombre || "Sin nombre"}</span>
                  <span className="tag" style={{ background: `${COLOR_TIPO[c.tipo ?? "Colonia"]}1a`, color: COLOR_TIPO[c.tipo ?? "Colonia"] }}>{c.tipo ?? "Colonia"}</span>
                </div>
                <div className="row" style={{ gap: 10, fontSize: 11 }}>
                  <span className="muted">{alcanceDe(c.nombre) ?? "—"} vecinos</span>
                  {(reportes[c.nombre] ?? 0) > 0 && <span style={{ color: "var(--danger)" }}>{reportes[c.nombre]} reportes</span>}
                  {sinAgua.has(c.nombre) && <span style={{ color: "var(--danger)" }}>sin agua</span>}
                  {typeof c.lat !== "number" && <span style={{ color: "var(--warn)" }}>sin centro</span>}
                </div>
              </button>
            )))}
          </div>
        ))}
      </div>

      <div className="col grow" style={{ gap: 10 }}>
        <Mapa alto={actual ? 380 : "calc(100vh - 220px)"} marcadores={marcadores} globo={globo} onClick={clicMapa} editando={ponerCentro}
          ajustar={{ clave: `colonias-${conCentro.length}`, puntos: conCentro.map((c) => ({ lng: c.lng!, lat: c.lat! })) }} />
        <div className="row" style={{ gap: 14, fontSize: 12 }}>
          {TIPOS_COLONIA.map((t) => <span key={t} className="row" style={{ gap: 6, alignItems: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: COLOR_TIPO[t] }} />{t}</span>)}
        </div>

        {actual && sel !== null && (
          <div className="card col" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 10 }}>
              <div className="field grow"><label className="section-label">NOMBRE</label>
                <input className={`input${repetida(actual.nombre) ? " error" : ""}`} value={actual.nombre} onChange={(e) => poner(sel, { nombre: e.target.value, id: actual.id || aSlug(e.target.value) })} />
                {repetida(actual.nombre) && <span style={{ color: "var(--danger)", fontSize: 11 }}>Ya existe una con ese nombre.</span>}</div>
              <div className="field grow"><label className="section-label">ZONA</label>
                <input className="input" list="zonas-colonias" value={actual.zona ?? ""} onChange={(e) => poner(sel, { zona: e.target.value })} placeholder="Centro y zonas tradicionales" /></div>
            </div>
            <datalist id="zonas-colonias">{zonasUsadas.map((z) => <option key={z} value={z} />)}</datalist>
            <div className="field"><label className="section-label">TIPO</label>
              <div className="seg">{TIPOS_COLONIA.map((t) => <button key={t} type="button" className={(actual.tipo ?? "Colonia") === t ? "on azul" : ""} onClick={() => poner(sel, { tipo: t })}>{t}</button>)}</div></div>
            <div className="row" style={{ gap: 10 }}>
              <div className="field grow"><label className="section-label">HORARIO DE AGUA</label><input className="input" value={actual.horario ?? ""} placeholder="6:00 – 14:00 hrs" onChange={(e) => poner(sel, { horario: e.target.value })} /></div>
              <div className="field grow"><label className="section-label">POZO QUE LA ABASTECE</label><input className="input" value={actual.pozo ?? ""} onChange={(e) => poner(sel, { pozo: e.target.value })} /></div>
            </div>
            <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button className={`btn ${ponerCentro ? "primary" : "ghost"}`} type="button" onClick={() => setPonerCentro((v) => !v)}>
                {ponerCentro ? "Toca el mapa donde está el centro…" : typeof actual.lat === "number" ? "Mover centro en el mapa" : "Marcar centro en el mapa"}
              </button>
              {typeof actual.lat === "number" && <span className="muted" style={{ fontSize: 12 }}>{actual.lat}, {actual.lng}</span>}
              <span className="grow" />
              <button className="btn ghost" style={{ color: "var(--danger)" }} type="button" onClick={() => { setLista((l) => l.filter((_, k) => k !== sel)); setSel(null); setCambios(true); }}>Quitar</button>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>Cambiar el nombre no mueve a los vecinos que ya la eligieron en la app.</span>
          </div>
        )}

        <div className="row" style={{ justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
          {estado === "listo" && <span className="muted" style={{ fontSize: 13 }}>Guardado. La app ya lo ve.</span>}
          {estado === "error" && <span style={{ color: "var(--danger)", fontSize: 13 }}>No se pudo guardar.</span>}
          {!valida && <span style={{ color: "var(--danger)", fontSize: 13 }}>Hay colonias sin nombre o repetidas.</span>}
          <button className="btn primary" type="button" disabled={!cambios || !valida || estado === "guardando"} onClick={guardar}>
            {estado === "guardando" ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
