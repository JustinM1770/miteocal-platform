"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Modal from "@/components/Modal";
import Mapa from "@/components/Mapa";
import { Kpi } from "@/components/graficas";
import { haceTexto, publicacionesDeTipo, type Publicacion } from "@/lib/datos";
import { coloniasDeZona, zonas } from "@/lib/config";
import { NIVELES, TURNOS, guardarEscuela, listarEscuelas, type Escuela, type Nivel } from "@/lib/escuelas";

const COLOR_NIVEL: Record<Nivel, string> = { Preescolar: "verde", Primaria: "azul", Secundaria: "morado", Bachillerato: "naranja", Universidad: "rojo", "Educación especial": "gris" };
const NUEVA: Escuela = { nombre: "", nivel: "Primaria", descripcion: "Educación primaria", turno: "Matutino", cct: "", colonia: "", direccion: "", director: "", telefono: "", alumnos: 0, activa: true };
const cctValida = (c: string) => !c || /^\d{2}[A-Z]{3}\d{4}[A-Z]$/.test(c.trim().toUpperCase());

export default function Planteles() {
  const { sesion } = useAuth();
  const router = useRouter();
  const [lista, setLista] = useState<Escuela[]>([]);
  const [avisos, setAvisos] = useState<Publicacion[]>([]);
  const [nivel, setNivel] = useState<Nivel | "Todas">("Todas");
  const [buscar, setBuscar] = useState("");
  const [editando, setEditando] = useState<Escuela | null>(null);

  const cargar = useCallback(async () => {
    const [e, a] = await Promise.all([listarEscuelas(), publicacionesDeTipo("escuela", 200)]);
    setLista([...e]); setAvisos(a);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const avisosDe = useMemo(() => {
    const m = new Map<string, Publicacion[]>();
    for (const a of avisos) { const k = a.datos?.escuela ?? ""; m.set(k, [...(m.get(k) ?? []), a]); }
    return m;
  }, [avisos]);

  const q = buscar.trim().toLowerCase();
  const visibles = lista.filter((x) => (nivel === "Todas" || x.nivel === nivel) && (!q || `${x.nombre} ${x.colonia} ${x.cct}`.toLowerCase().includes(q)));
  const activas = lista.filter((x) => x.activa);

  return (
    <>
      <div className="row">
        <Kpi n={activas.length} t="Escuelas en la app" s={`${NIVELES.filter((n) => activas.some((x) => x.nivel === n)).length} niveles`} />
        <Kpi n={activas.reduce((s, x) => s + x.alumnos, 0).toLocaleString("es-MX")} t="Alumnos" s="según cada plantel" />
        <Kpi n={activas.reduce((s, x) => s + (x.seguidores ?? 0), 0).toLocaleString("es-MX")} t="Papás que siguen escuelas" s="reciben sus avisos" />
        <Kpi n={avisos.length} t="Avisos publicados" s="suspensiones, eventos, avisos" onClick={() => router.push("/panel/escuelas")} />
      </div>

      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="seg">
          {(["Todas", ...NIVELES] as const).map((n) => (
            <button key={n} type="button" className={nivel === n ? `on ${n === "Todas" ? "azul" : COLOR_NIVEL[n]}` : ""} onClick={() => setNivel(n)}>
              {n} · {n === "Todas" ? lista.length : lista.filter((x) => x.nivel === n).length}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" style={{ width: 220 }} placeholder="Buscar escuela, colonia o CCT" aria-label="Buscar escuela" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          <button className="btn primary" type="button" onClick={() => setEditando({ ...NUEVA })}>Agregar escuela</button>
        </div>
      </div>

      {visibles.length === 0 && <div className="card muted">{lista.length ? "Ninguna escuela coincide." : "Todavía no hay escuelas. Agrega las del municipio para que los papás las sigan."}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {visibles.map((x) => {
          const suyos = avisosDe.get(x.nombre) ?? [];
          return (
            <div key={x.id} className="card col" style={{ gap: 8, opacity: x.activa ? 1 : 0.55 }}>
              <div className="row" style={{ gap: 10, alignItems: "center" }}>
                <span className="icon-sq" aria-hidden>🎓</span>
                <div className="col grow" style={{ gap: 1 }}>
                  <strong>{x.nombre}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>{x.descripcion}{x.cct ? ` · ${x.cct}` : ""}</span>
                </div>
                <span className={`tag ${COLOR_NIVEL[x.nivel]}`}>{x.nivel}</span>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>{[x.turno, x.colonia, x.director].filter(Boolean).join(" · ")}</span>
              <div className="row" style={{ gap: 14, fontSize: 13 }}>
                <span><strong>{x.alumnos}</strong> <span className="muted">alumnos</span></span>
                <span><strong>{x.seguidores ?? 0}</strong> <span className="muted">la siguen</span></span>
                <span><strong>{suyos.length}</strong> <span className="muted">avisos</span></span>
              </div>
              {suyos[0] && <span className="muted" style={{ fontSize: 12 }}>Último: {suyos[0].datos?.categoria ?? suyos[0].titulo} · {haceTexto(suyos[0].publicarEn)}</span>}
              {!x.activa && <span className="tag gris">Oculta en la app</span>}
              <div className="row" style={{ gap: 8 }}>
                <button className="btn primary" style={{ padding: "7px 12px" }} type="button" disabled={!x.activa}
                  onClick={() => router.push(`/panel/escuelas?escuela=${encodeURIComponent(x.nombre)}`)}>Publicar aviso</button>
                <button className="btn ghost" style={{ padding: "7px 12px" }} type="button" onClick={() => setEditando({ ...x })}>Editar</button>
              </div>
            </div>
          );
        })}
      </div>

      {editando && (
        <Editor escuela={editando} onCerrar={() => setEditando(null)}
          onGuardar={async (x) => { await guardarEscuela(x, sesion!.nombre); setEditando(null); await cargar(); }} />
      )}
    </>
  );
}

function Editor({ escuela, onCerrar, onGuardar }: { escuela: Escuela; onCerrar: () => void; onGuardar: (e: Escuela) => Promise<void> }) {
  const [x, setX] = useState<Escuela>(escuela);
  const [guardando, setGuardando] = useState(false);
  const poner = (c: Partial<Escuela>) => setX({ ...x, ...c });
  const listo = x.nombre.trim() && cctValida(x.cct) && x.alumnos >= 0;
  const punto = x.lat !== undefined && x.lng !== undefined ? { lng: x.lng, lat: x.lat } : null;
  const marcadores = useMemo(() => (punto ? [{ id: "e", punto, color: "#1552e0", texto: "🎓" }] : []), [punto?.lat, punto?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal titulo={escuela.id ? "Editar escuela" : "Nueva escuela"} onCerrar={onCerrar} ancho={900}>
      <div className="row" style={{ gap: 24 }}>
        <div className="col grow" style={{ gap: 12 }}>
          <div className="field"><label className="section-label">NOMBRE</label>
            <input className="input" value={x.nombre} disabled={Boolean(escuela.id)} onChange={(e) => poner({ nombre: e.target.value })} placeholder="Primaria Benito Juárez" />
            {escuela.id && <span className="muted" style={{ fontSize: 11 }}>El nombre define el id y los avisos ya publicados; no se cambia.</span>}</div>
          <div className="field"><label className="section-label">NIVEL</label>
            <div className="seg">{NIVELES.map((n) => <button key={n} type="button" className={x.nivel === n ? `on ${COLOR_NIVEL[n]}` : ""} onClick={() => poner({ nivel: n })}>{n}</button>)}</div></div>
          <div className="row" style={{ gap: 10 }}>
            <div className="field grow"><label className="section-label">DESCRIPCIÓN EN LA APP</label><input className="input" value={x.descripcion} onChange={(e) => poner({ descripcion: e.target.value })} placeholder="Bachillerato tecnológico" /></div>
            <div className="field" style={{ width: 170 }}><label className="section-label">TURNO</label>
              <select className="select" value={x.turno} onChange={(e) => poner({ turno: e.target.value })}>{TURNOS.map((t) => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <div className="field grow"><label className="section-label">CLAVE CCT · OPCIONAL</label>
              <input className={`input${!cctValida(x.cct) ? " error" : ""}`} value={x.cct} onChange={(e) => poner({ cct: e.target.value.toUpperCase() })} placeholder="14DES0020L" />
              {!cctValida(x.cct) && <span style={{ color: "var(--danger)", fontSize: 11 }}>Formato: 2 números, 3 letras, 4 números y 1 letra.</span>}</div>
            <div className="field" style={{ width: 120 }}><label className="section-label">ALUMNOS</label><input className="input" type="number" min={0} value={x.alumnos} onChange={(e) => poner({ alumnos: Math.max(0, +e.target.value) })} /></div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <div className="field grow"><label className="section-label">COLONIA</label>
              <select className="select" value={x.colonia} onChange={(e) => poner({ colonia: e.target.value })}>
                <option value="">Sin colonia</option>
                {zonas().map((z) => <optgroup key={z} label={z}>{coloniasDeZona(z).map((c) => <option key={c.id}>{c.nombre}</option>)}</optgroup>)}
              </select></div>
            <div className="field grow"><label className="section-label">DIRECCIÓN</label><input className="input" value={x.direccion} onChange={(e) => poner({ direccion: e.target.value })} /></div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <div className="field grow"><label className="section-label">DIRECTOR(A)</label><input className="input" value={x.director} onChange={(e) => poner({ director: e.target.value })} /></div>
            <div className="field grow"><label className="section-label">TELÉFONO</label><input className="input" type="tel" value={x.telefono} onChange={(e) => poner({ telefono: e.target.value })} /></div>
          </div>
          <div className="field"><label className="section-label">UBICACIÓN · TOCA EL MAPA</label>
            <Mapa alto={200} zoom={15} marcadores={marcadores} editando onClick={(p) => poner({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) })}
              ajustar={punto ? { clave: "escuela", puntos: [punto] } : undefined} /></div>
          <div className="row" style={{ alignItems: "center", gap: 14 }}>
            <div className="col grow"><strong style={{ fontSize: 13 }}>Visible en la app</strong><span className="muted" style={{ fontSize: 12 }}>Apágala si cerró o ya no participa.</span></div>
            <button type="button" className={`toggle${x.activa ? " on" : ""}`} aria-pressed={x.activa} aria-label="Visible en la app" onClick={() => poner({ activa: !x.activa })}><span className="knob" /></button>
          </div>
          <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button className="btn ghost" type="button" onClick={onCerrar}>Cancelar</button>
            <button className="btn primary" type="button" disabled={!listo || guardando} onClick={async () => { setGuardando(true); await onGuardar({ ...x, nombre: x.nombre.trim(), cct: x.cct.trim().toUpperCase() }); }}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>

        <div className="col" style={{ width: 290, flex: "0 0 290px", gap: 10 }}>
          <span className="section-label">ASÍ SE VERÁ EN LA APP</span>
          <div className="phone">
            <div className="phone-head"><span className="back">‹</span><div><strong>Escuelas</strong><span>Avisos de los planteles que sigues</span></div></div>
            <span className="section-label">TUS ESCUELAS</span>
            <div className="acard" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <span className="icon-sq">🎓</span>
              <div className="col grow" style={{ gap: 1 }}>
                <span className="t" style={{ fontSize: 13 }}>{x.nombre || "Nombre de la escuela"}</span>
                <span className="s">{x.descripcion || x.nivel}</span>
              </div>
              <span className="toggle on" style={{ pointerEvents: "none" }}><span className="knob" /></span>
            </div>
            <span className="section-label">AGREGAR OTRA ESCUELA</span>
            <div className="acard flat" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <div className="col"><span className="t" style={{ fontSize: 12 }}>{x.nombre || "Nombre"}</span><span className="s">{x.nivel}</span></div>
              <span style={{ color: "var(--brand)", fontSize: 12, fontWeight: 600 }}>+ Seguir</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
