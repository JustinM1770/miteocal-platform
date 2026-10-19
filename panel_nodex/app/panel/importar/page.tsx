"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { registrar } from "@/lib/datos";
import { aSlug, cfg, guardarConfig, type Colonia, type Emergencia, type TipoColonia } from "@/lib/config";
import { ESQUEMAS, columnasIgnoradas, leerCSV, plantilla, validar, type EsquemaCSV } from "@/lib/importar";
import { importarComercios } from "@/lib/comercios";
import { importarEscuelas } from "@/lib/escuelas";
import { importarEventos } from "@/lib/feria";

type Modo = "agregar" | "reemplazar";

export default function Importar() {
  const { sesion } = useAuth();
  const [esquema, setEsquema] = useState<EsquemaCSV>(ESQUEMAS[0]);
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState("");
  const [modo, setModo] = useState<Modo>("agregar");
  const [estado, setEstado] = useState<"" | "guardando">("");
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analisis = useMemo(() => (texto.trim() ? validar(esquema, leerCSV(texto)) : null), [texto, esquema]);
  const listas = analisis?.validadas.filter((f) => !f.errores.length) ?? [];
  const conErrores = analisis?.validadas.filter((f) => f.errores.length) ?? [];
  const ignoradas = analisis ? columnasIgnoradas(esquema, analisis.encabezados) : [];
  const puede = Boolean(analisis && !analisis.errorGeneral && listas.length && !conErrores.length);

  function elegir(e: EsquemaCSV) { setEsquema(e); setTexto(""); setArchivo(""); setResultado(null); setError(null); }

  function descargarPlantilla() {
    const url = URL.createObjectURL(new Blob([plantilla(esquema)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `plantilla-${esquema.id}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  async function importar() {
    setEstado("guardando"); setError(null); setResultado(null);
    const filas = listas.map((f) => f.datos);
    try {
      let mensaje = "";
      if (esquema.id === "colonias" || esquema.id === "emergencias") {
        // Documento de config: se reemplaza la lista o se combinan por id
        const nuevas = filas.map((f) => esquema.id === "colonias"
          ? { id: aSlug(String(f.nombre)), nombre: String(f.nombre), zona: f.zona as string | undefined, tipo: f.tipo as TipoColonia | undefined, lat: f.lat as number | undefined, lng: f.lng as number | undefined, horario: f.horario as string | undefined, pozo: f.pozo as string | undefined }
          : { id: aSlug(String(f.nombre)), nombre: String(f.nombre), telefono: String(f.telefono), categoria: f.categoria as string | undefined, nota: f.nota as string | undefined });
        const limpias = nuevas.map((x) => Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined)));
        const actuales = (esquema.id === "colonias" ? cfg().colonias : cfg().emergencias) as { id: string }[];
        const final = modo === "reemplazar" ? limpias : [
          ...actuales.map((a) => ({ ...a, ...(limpias.find((n) => n.id === a.id) ?? {}) })),
          ...limpias.filter((n) => !actuales.some((a) => a.id === n.id)),
        ];
        if (esquema.id === "colonias") await guardarConfig("colonias", final as unknown as Colonia[]);
        else await guardarConfig("emergencias", final as unknown as Emergencia[]);
        mensaje = `${limpias.length} renglones importados · la lista quedó con ${final.length}.`;
      } else {
        const r = esquema.id === "comercios" ? await importarComercios(filas)
          : esquema.id === "escuelas" ? await importarEscuelas(filas)
          : await importarEventos(filas);
        mensaje = r.actualizados ? `${r.nuevos} nuevos y ${r.actualizados} actualizados.` : `${r.nuevos} guardados (los que ya existían se actualizaron).`;
      }
      await registrar(`Importó ${esquema.titulo.toLowerCase()} desde CSV`, `${filas.length} renglones${archivo ? ` · ${archivo}` : ""}`, "interno", sesion!.nombre);
      setResultado(mensaje);
      setTexto(""); setArchivo("");
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setError(code === "permission-denied" ? "No tienes permiso para importar esto." : `No se pudo importar: ${(e as Error).message}`);
    } finally { setEstado(""); }
  }

  return (
    <div className="row">
      <div className="card col" style={{ width: 320, flex: "0 0 320px", gap: 8 }}>
        <h3 className="h3">¿Qué vas a importar?</h3>
        {ESQUEMAS.map((e) => (
          <button key={e.id} type="button" className="acard" onClick={() => elegir(e)}
            style={{ textAlign: "left", cursor: "pointer", borderColor: esquema.id === e.id ? "var(--brand)" : undefined, borderWidth: esquema.id === e.id ? 2 : 1, borderStyle: "solid" }}>
            <span className="t" style={{ fontSize: 13 }}>{e.titulo}</span>
            <span className="s">{e.descripcion}</span>
          </button>
        ))}
      </div>

      <div className="card grow col" style={{ gap: 14 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="col" style={{ gap: 2 }}>
            <h3 className="h3">{esquema.titulo}</h3>
            <span className="muted" style={{ fontSize: 12 }}>Columnas: {esquema.campos.map((c) => `${c.clave}${c.requerido ? "*" : ""}`).join(", ")} · * obligatoria</span>
          </div>
          <button className="btn ghost" type="button" onClick={descargarPlantilla}>Descargar plantilla</button>
        </div>

        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <label className="btn primary" style={{ cursor: "pointer" }}>
            Elegir archivo CSV
            <input type="file" accept=".csv,text/csv" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              setArchivo(f.name); setResultado(null); setTexto(await f.text());
            }} />
          </label>
          <span className="muted" style={{ fontSize: 12 }}>{archivo || "En Excel: Archivo → Guardar como → CSV UTF-8."}</span>
        </div>
        <textarea className="textarea" style={{ minHeight: 110, fontFamily: "ui-monospace, monospace", fontSize: 12 }} value={texto}
          onChange={(e) => { setTexto(e.target.value); setArchivo(""); setResultado(null); }} placeholder={`…o pega el CSV aquí:\n\n${esquema.ejemplo}`} aria-label="Contenido CSV" />

        {esquema.destino === "config" && (
          <div className="field"><label className="section-label">CÓMO GUARDAR</label>
            <div className="seg">
              <button type="button" className={modo === "agregar" ? "on azul" : ""} onClick={() => setModo("agregar")}>Agregar y actualizar</button>
              <button type="button" className={modo === "reemplazar" ? "on rojo" : ""} onClick={() => setModo("reemplazar")}>Reemplazar toda la lista</button>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{modo === "agregar" ? "Las que ya existen (mismo nombre) se actualizan; las nuevas se agregan; no se borra ninguna." : "La lista actual se sustituye por la del archivo."}</span></div>
        )}

        {analisis?.errorGeneral && <div className="banner" style={{ background: "var(--danger-soft)" }}><strong style={{ color: "var(--danger)" }}>{analisis.errorGeneral}</strong></div>}
        {analisis && !analisis.errorGeneral && (
          <>
            <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span className="tag verde">{listas.length} listos</span>
              {conErrores.length > 0 && <span className="tag rojo">{conErrores.length} con errores</span>}
              {ignoradas.length > 0 && <span className="tag gris">Columnas ignoradas: {ignoradas.join(", ")}</span>}
            </div>
            <div style={{ maxHeight: 320, overflow: "auto" }}>
              <table className="tabla">
                <thead><tr><th>#</th>{esquema.campos.map((c) => <th key={c.clave}>{c.clave.toUpperCase()}</th>)}<th>ERRORES</th></tr></thead>
                <tbody>
                  {analisis.validadas.slice(0, 200).map((f) => (
                    <tr key={f.numero} style={f.errores.length ? { background: "var(--danger-soft)" } : undefined}>
                      <td className="muted">{f.numero}</td>
                      {esquema.campos.map((c) => <td key={c.clave} style={{ fontSize: 12 }}>{f.datos[c.clave] === true ? "Sí" : f.datos[c.clave] === false ? "No" : String(f.datos[c.clave] ?? "")}</td>)}
                      <td style={{ color: "var(--danger)", fontSize: 12 }}>{f.errores.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {resultado && <div className="banner" style={{ background: "var(--ok-soft)" }}><strong>✓ {resultado}</strong></div>}
        {error && <div className="banner" style={{ background: "var(--danger-soft)" }}><strong style={{ color: "var(--danger)" }}>{error}</strong></div>}

        <div className="row" style={{ justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
          {conErrores.length > 0 && <span className="muted" style={{ fontSize: 12 }}>Corrige los renglones en rojo y vuelve a cargar el archivo.</span>}
          <button className="btn primary" type="button" disabled={!puede || estado === "guardando"} onClick={importar}>
            {estado === "guardando" ? "Importando…" : `Importar ${listas.length || ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
