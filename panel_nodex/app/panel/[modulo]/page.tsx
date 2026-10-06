"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import ModalConfirmar from "@/components/ModalConfirmar";
import VistaApp, { type Item } from "@/components/VistaApp";
import TramoMapa from "@/components/TramoMapa";
import { moduloPorSlug, type Campo } from "@/lib/modulos";
import {
  COLONIAS, ZONAS, alcanceDe, haceTexto, publicacionesDeTipo, publicar, type Publicacion,
} from "@/lib/datos";

const DEL_DOC = new Set(["titulo", "mensaje", "colonia"]);

export default function PaginaModulo() {
  const { modulo: slug } = useParams<{ modulo: string }>();
  const mod = moduloPorSlug(slug);
  const { sesion } = useAuth();
  const router = useRouter();

  const [valores, setValores] = useState<Record<string, string>>({});
  const [notificar, setNotificar] = useState(mod?.notificarPorDefecto ?? false);
  const [programar, setProgramar] = useState(false);
  const [cuando, setCuando] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [lista, setLista] = useState<Publicacion[]>([]);

  const cargar = useCallback(async () => {
    if (mod) setLista(await publicacionesDeTipo(mod.tipo));
  }, [mod]);

  useEffect(() => { cargar(); }, [cargar]);

  // Al cambiar de módulo se limpia el formulario
  useEffect(() => {
    setValores({}); setNotificar(mod?.notificarPorDefecto ?? false);
    setProgramar(false); setCuando(""); setAviso(null);
  }, [mod]);

  const datos = useMemo(() => {
    const d: Record<string, string> = {};
    for (const [k, v] of Object.entries(valores)) if (!DEL_DOC.has(k) && v.trim()) d[k] = v.trim();
    return d;
  }, [valores]);

  if (!mod) {
    return (
      <div className="card col" style={{ gap: 10, alignItems: "flex-start" }}>
        <h3 className="h3">Este módulo no existe</h3>
        <button className="btn ghost" type="button" onClick={() => router.push("/panel")}>Volver al escritorio</button>
      </div>
    );
  }

  const publico = mod.canal === "publico";
  const colonia = valores.colonia || null;
  const alcance = alcanceDe(colonia);
  const programadoPara = programar && cuando ? new Date(cuando) : null;
  const titulo = (mod.tituloDe ? mod.tituloDe(valores) : valores.titulo ?? "").trim();
  const mensaje = (valores.mensaje ?? "").trim();
  const resumen = mod.resumen?.(datos) ?? "";

  const faltan = mod.campos.filter((c) => !c.opcional && !(valores[c.clave] ?? "").trim());
  const listo = faltan.length === 0 && (!programar || Boolean(cuando));

  function poner(clave: string, v: string) {
    setValores((s) => ({ ...s, [clave]: v }));
  }

  async function guardar(conAviso: boolean) {
    const sale = programadoPara ?? new Date();
    await publicar({
      tipo: mod!.tipo, canal: mod!.canal, colonia, estado: null,
      titulo, mensaje, horaEstimada: null,
      publicarEn: sale,
      caducaEn: mod!.caducaHoras ? new Date(+sale + mod!.caducaHoras * 3600_000) : null,
      notificar: publico && conAviso, alcance: publico ? alcance : 0,
      autorNombre: sesion!.nombre, autorUid: sesion!.uid,
      datos,
    }, `Publicó en ${mod!.nombre}`);
    setConfirmando(false);
    setValores({});
    setProgramar(false); setCuando("");
    setAviso(programadoPara ? "Quedó programado." : publico ? "Publicado. Ya aparece en la app." : "Publicado para el personal.");
    await cargar();
  }

  return (
    <>
      {aviso && (
        <div className="banner info">
          <strong>{aviso}</strong>
          <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" onClick={() => setAviso(null)}>Cerrar</button>
        </div>
      )}

      <div className="row">
        <div className="col grow" style={{ gap: 18 }}>
          <div className="card col" style={{ gap: 20 }}>
            <div className="col" style={{ gap: 4 }}>
              <h3 className="h3">{mod.nombre}</h3>
              <span className="muted" style={{ fontSize: 13 }}>{mod.descripcion}</span>
            </div>
            {mod.campos.map((c) => (
              <CampoForm key={c.clave} campo={c} valor={valores[c.clave] ?? ""} onCambio={(v) => poner(c.clave, v)} />
            ))}
          </div>

          <div className="card col" style={{ gap: 14 }}>
            <div className="banner info" style={{ gap: 10, background: publico ? undefined : "var(--internal-soft)" }}>
              <span className="pill" style={{ background: publico ? "var(--brand)" : "var(--internal)", color: "#fff" }}>
                {publico ? "PÚBLICO" : "INTERNO"}
              </span>
              <span className="grow" style={{ fontWeight: 500 }}>
                {publico
                  ? `Sale a la app en «${mod.pantalla}». La verán ${colonia ? `los vecinos de ${colonia}` : "todos los vecinos del municipio"}.`
                  : "Solo lo ve el personal del ayuntamiento. No sale a la app."}
              </span>
            </div>

            {publico && (
              <div className="row" style={{ alignItems: "center", gap: 14 }}>
                <div className="col grow" style={{ gap: 2 }}>
                  <strong>Enviar notificación al teléfono</strong>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {alcance} vecinos recibirán una alerta. No se puede deshacer.
                  </span>
                </div>
                <button type="button" className={`toggle${notificar ? " on" : ""}`}
                  aria-pressed={notificar} onClick={() => setNotificar((v) => !v)}>
                  <span className="knob" />
                </button>
              </div>
            )}

            <div className="row" style={{ alignItems: "center", gap: 14, borderTop: publico ? "1px solid var(--border)" : undefined, paddingTop: publico ? 14 : 0 }}>
              <div className="col grow" style={{ gap: 2 }}>
                <strong>Programar la publicación</strong>
                <span className="muted" style={{ fontSize: 13 }}>Déjalo cargado y sale solo a la hora que elijas.</span>
              </div>
              <button type="button" className={`toggle${programar ? " on" : ""}`}
                aria-pressed={programar} onClick={() => setProgramar((v) => !v)}>
                <span className="knob" />
              </button>
            </div>
            {programar && (
              <input className="input" type="datetime-local" value={cuando} onChange={(e) => setCuando(e.target.value)} />
            )}

            {mod.caducaHoras && (
              <span className="muted" style={{ fontSize: 12 }}>
                Caduca solo en {mod.caducaHoras >= 48 ? `${Math.round(mod.caducaHoras / 24)} días` : `${mod.caducaHoras} horas`}.
                Después la app deja de mostrarlo.
              </span>
            )}
          </div>

          <div className="row" style={{ justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
            {!listo && faltan.length > 0 && (
              <span className="muted grow" style={{ fontSize: 12 }}>
                Falta: {faltan.map((c) => c.etiqueta.toLowerCase()).join(", ")}
              </span>
            )}
            {publico && notificar && (
              <button className="btn ghost" type="button" disabled={!listo} onClick={() => guardar(false)}>
                Guardar sin notificar
              </button>
            )}
            <button className="btn primary" type="button" disabled={!listo}
              onClick={() => (publico && notificar ? setConfirmando(true) : guardar(false))}>
              {programar ? "Programar publicación" : publico && notificar ? `${mod.accion} y notificar` : mod.accion}
            </button>
          </div>
        </div>

        <div className="col" style={{ width: 380, flex: "0 0 380px", gap: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span className="section-label">{publico ? "ASÍ SE VERÁ EN LA APP" : "ASÍ LO VERÁ EL PERSONAL"}</span>
            {publico && <span className="muted" style={{ fontSize: 11 }}>Pantalla {mod.pantalla}</span>}
          </div>
          <VistaApp mod={mod} items={[
            { titulo, mensaje, colonia, datos, creadoEn: new Date(), nuevo: true } satisfies Item,
            ...lista.map((p) => ({ id: p.id, titulo: p.titulo, mensaje: p.mensaje, colonia: p.colonia, datos: p.datos ?? {}, creadoEn: p.creadoEn })),
          ]} />
          {programadoPara && (
            <span className="muted" style={{ fontSize: 12 }}>
              Se publicará el {programadoPara.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.
            </span>
          )}

          {publico && notificar && titulo && (
            <div className="card col" style={{ gap: 4 }}>
              <span className="section-label">NODEX · AHORA</span>
              <strong>{titulo}</strong>
              <span className="muted" style={{ fontSize: 13 }}>{mensaje || resumen || "—"}</span>
            </div>
          )}

          <div className="card col" style={{ gap: 0, paddingBottom: 8 }}>
            <h3 className="h3" style={{ paddingBottom: 8 }}>Publicado en este módulo</h3>
            {lista.length === 0 && <span className="muted" style={{ paddingBottom: 12, fontSize: 13 }}>Todavía no hay nada.</span>}
            {lista.map((p, i) => (
              <div className="list-row" key={p.id ?? i} style={{ alignItems: "flex-start", gap: 10 }}>
                <div className="col grow" style={{ gap: 2 }}>
                  <strong style={{ fontSize: 13 }}>{p.titulo}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {[mod.resumen?.(p.datos ?? {}), p.colonia].filter(Boolean).join(" · ") || p.mensaje}
                  </span>
                  <span className="muted" style={{ fontSize: 11 }}>{haceTexto(p.creadoEn)} · {p.autorNombre}</span>
                </div>
                {p.notificar && <span className="pill publico">NOTIFICADO</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {confirmando && (
        <ModalConfirmar
          colonia={colonia ?? "Todo el municipio"} alcance={alcance} titulo={titulo}
          cuerpo={mensaje || resumen} programadoPara={programadoPara}
          onCancelar={() => setConfirmando(false)}
          onConfirmar={() => guardar(true)}
        />
      )}
    </>
  );
}

function CampoForm({ campo, valor, onCambio }: { campo: Campo; valor: string; onCambio: (v: string) => void }) {
  const etiqueta = (
    <label className="section-label">
      {campo.etiqueta.toUpperCase()}{campo.opcional && <span style={{ fontWeight: 500 }}> · OPCIONAL</span>}
    </label>
  );
  let control: React.ReactNode;
  switch (campo.tipo) {
    case "area":
      control = <textarea className="textarea" value={valor} placeholder={campo.placeholder} onChange={(e) => onCambio(e.target.value)} />;
      break;
    case "select":
      control = (
        <select className="select" value={valor} onChange={(e) => onCambio(e.target.value)}>
          <option value="">Elige una opción</option>
          {campo.opciones!.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;
    case "seg":
      control = (
        <div className="seg">
          {campo.opciones!.map((o, i) => (
            <button key={o} type="button" className={valor === o ? `on ${campo.colores?.[i] ?? "azul"}` : ""}
              onClick={() => onCambio(valor === o && campo.opcional ? "" : o)}>{o}</button>
          ))}
        </div>
      );
      break;
    case "dias": {
      const sel = valor.split(",").filter(Boolean);
      control = (
        <div className="dias">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <button key={d} type="button" className={`dia${sel.includes(d) ? " on" : ""}`} aria-pressed={sel.includes(d)}
              onClick={() => onCambio(["L", "M", "X", "J", "V", "S", "D"].filter((x) => (x === d ? !sel.includes(d) : sel.includes(x))).join(","))}>
              {d}
            </button>
          ))}
        </div>
      );
      break;
    }
    case "tramo":
      control = <TramoMapa valor={valor} onCambio={onCambio} />;
      break;
    case "colonia":
      control = (
        <select className="select" value={valor} onChange={(e) => onCambio(e.target.value)}>
          <option value="">{campo.opcional ? "Todo el municipio" : "Elige una colonia"}</option>
          {ZONAS.map((z) => (
            <optgroup key={z} label={z}>
              {COLONIAS.filter((c) => c.zona === z).map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre} · {c.vecinos} vecinos</option>)}
            </optgroup>
          ))}
        </select>
      );
      break;
    default: {
      const type = { fecha: "date", hora: "time", tel: "tel", url: "url", texto: "text" }[campo.tipo];
      control = <input className="input" type={type} value={valor} placeholder={campo.placeholder} onChange={(e) => onCambio(e.target.value)} />;
    }
  }
  return (
    <div className="field">
      {etiqueta}
      {campo.ayuda && <span className="muted" style={{ fontSize: 12 }}>{campo.ayuda}</span>}
      {control}
    </div>
  );
}
