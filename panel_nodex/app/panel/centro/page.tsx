"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Kpi } from "@/components/graficas";
import Modal from "@/components/Modal";
import { auth, firebaseListo } from "@/lib/firebase";
import { cfg } from "@/lib/config";
import { centro, MAPBOX_TOKEN, type Punto } from "@/lib/mapas";
import { ETIQUETA_REPORTE, ETIQUETA_ESTADO_REPORTE, haceTexto, listarReportes, type Reporte, type TipoReporte } from "@/lib/datos";
import { listarRutas, type RutaBasura } from "@/lib/basura";
import {
  ALTURA_URGENCIA, COLOR_TIPO, abierto, aplicaFiltro, cuadro, informe, interpretarOrden, narrar, urgenciaDe,
  type Capa, type Orden,
} from "@/lib/centro";
import s from "./centro.module.css";

/* Centro de mando: el municipio en 3D con los reportes como columnas de
   color, capas de servicios y órdenes por voz o texto. Con «Pantalla
   completa» se proyecta en la pantalla grande de la oficina. */

const MODELO_CATASTRO = "https://catastro.jalisco.gob.mx/modelados/Teocaltiche-0001_3D_2020/app/noborders.html";
const NOMBRE_CAPA: Record<Capa, string> = { edificios: "Edificios 3D", calor: "Zonas críticas", basura: "Camión de basura", cierres: "Cierres" };
const TIPOS: TipoReporte[] = ["fuga", "bache", "drenaje", "luminaria", "basura", "otro"];

type ConMarca = Reporte & { nuevo?: boolean };
type Geometria =
  | { type: "Point"; coordinates: number[] }
  | { type: "LineString"; coordinates: number[][] }
  | { type: "Polygon"; coordinates: number[][][] };
type Rasgo = { type: "Feature"; geometry: Geometria; properties: Record<string, unknown> };
const geo = (features: Rasgo[]) => ({ type: "FeatureCollection" as const, features });

// En el demo los reportes nuevos se simulan para ver el centro "en vivo"
const TIPOS_DEMO: TipoReporte[] = ["fuga", "bache", "luminaria", "basura", "drenaje", "fuga", "bache"];
function reporteSimulado(n: number): ConMarca {
  const colonias = cfg().colonias.filter((c) => typeof c.lat === "number");
  const c = colonias[Math.floor(Math.random() * colonias.length)];
  return {
    id: `sim-${Date.now()}`, folio: `TEC-${9000 + n}`, tipo: TIPOS_DEMO[Math.floor(Math.random() * TIPOS_DEMO.length)],
    colonia: c?.nombre ?? "Centro", direccion: "", descripcion: "Reporte simulado para el demo", fotoUrl: null,
    lat: (c?.lat ?? 21.4271) + (Math.random() - 0.5) * 0.004, lng: (c?.lng ?? -102.5764) + (Math.random() - 0.5) * 0.004,
    estado: "recibido", respuesta: null, vecinoNombre: "Vecino", historial: [], creadoEn: new Date(), nuevo: true,
  };
}

export default function CentroDeMando() {
  const marco = useRef<HTMLDivElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapboxMap | null>(null);
  const [listo, setListo] = useState(false);
  const [reportes, setReportes] = useState<ConMarca[]>([]);
  const [rutas, setRutas] = useState<RutaBasura[]>([]);
  const [filtro, setFiltro] = useState<Partial<Orden>>({});
  const [capas, setCapas] = useState<Record<Capa, boolean>>({ edificios: true, calor: false, basura: true, cierres: true });
  const [mensaje, setMensaje] = useState("");
  const [orden, setOrden] = useState("");
  const [vozActiva, setVozActiva] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [motor, setMotor] = useState<"ia" | "local">("local");
  const [catastro, setCatastro] = useState(false);
  const [girar, setGirar] = useState(true);
  const [ahora, setAhora] = useState(() => new Date());
  const ultimoToque = useRef(0);
  const girarRef = useRef(girar);
  girarRef.current = girar;
  const simulados = useRef(0);

  const municipio = cfg().nombre || "Municipio";
  const colonias = useMemo(() => cfg().colonias.map((c) => c.nombre), []);

  // ── Datos ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let vivo = true;
    const cargar = () => listarReportes().then((r) => vivo && setReportes((prev) => {
      const nuevos = new Set(prev.filter((x) => x.nuevo).map((x) => x.id));
      return [...prev.filter((x) => x.id?.startsWith("sim-")), ...r.map((x) => ({ ...x, nuevo: nuevos.has(x.id) }))];
    }));
    cargar();
    listarRutas().then((r) => vivo && setRutas(r.filter((x) => x.activa)));
    const datos = setInterval(cargar, 30_000);
    const reloj = setInterval(() => setAhora(new Date()), 30_000);
    const sim = firebaseListo ? null : setInterval(() => {
      simulados.current += 1;
      setReportes((prev) => [reporteSimulado(simulados.current), ...prev.map((x) => ({ ...x, nuevo: false }))]);
    }, 25_000);
    return () => { vivo = false; clearInterval(datos); clearInterval(reloj); if (sim) clearInterval(sim); };
  }, []);

  const visibles = useMemo(() => reportes.filter((r) => r.lat !== null && r.lng !== null && aplicaFiltro(r, filtro)), [reportes, filtro]);
  const resumen = useMemo(() => informe(reportes, ahora), [reportes, ahora]);
  const recientes = useMemo(
    () => [...reportes].filter(abierto).sort((a, b) => +new Date(b.creadoEn as Date) - +new Date(a.creadoEn as Date)).slice(0, 25),
    [reportes],
  );

  // ── Voz ───────────────────────────────────────────────────────────────
  const decir = useCallback((texto: string) => {
    setMensaje(texto);
    if (!vozActiva || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-MX";
    const voz = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("es"));
    if (voz) u.voice = voz;
    window.speechSynthesis.speak(u);
  }, [vozActiva]);

  // ── Mapa ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!MAPBOX_TOKEN || !caja.current) return;
    let vivo = true;
    let anim = 0;
    import("mapbox-gl").then((m) => {
      if (!vivo || !caja.current) return;
      const mb = m.default;
      mb.accessToken = MAPBOX_TOKEN;
      const c = centro();
      const map = new mb.Map({
        container: caja.current, style: "mapbox://styles/mapbox/light-v11",
        center: [c.lng, c.lat], zoom: 15.6, pitch: 60, bearing: -20, antialias: true, attributionControl: false,
      });
      map.addControl(new mb.NavigationControl({ visualizePitch: true }), "bottom-right");
      map.addControl(new mb.AttributionControl({ compact: true }), "bottom-right");
      mapa.current = map;
      ["mousedown", "touchstart", "wheel", "dragstart"].forEach((e) => map.on(e as "mousedown", () => { ultimoToque.current = Date.now(); }));

      map.on("load", () => {
        map.addSource("dem", { type: "raster-dem", url: "mapbox://mapbox.mapbox-terrain-dem-v1", tileSize: 512, maxzoom: 14 });
        map.setTerrain({ source: "dem", exaggeration: 1.3 });
        map.setFog({ color: "#f5f6f8", "high-color": "#dbe6fb", "horizon-blend": 0.1 });

        // Edificios en los azules de la marca
        map.addLayer({
          id: "edificios-3d", type: "fill-extrusion", source: "composite", "source-layer": "building", minzoom: 13,
          filter: ["==", ["get", "extrude"], "true"],
          paint: {
            "fill-extrusion-color": ["interpolate", ["linear"], ["get", "height"], 0, "#edf2fe", 10, "#c9d8fb", 25, "#8fb0f5"],
            "fill-extrusion-height": ["*", ["coalesce", ["get", "height"], 4], 1.2],
            "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
            "fill-extrusion-opacity": 0.9,
          },
        });

        map.addSource("calor", { type: "geojson", data: geo([]) });
        map.addLayer({
          id: "calor", type: "heatmap", source: "calor", layout: { visibility: "none" },
          paint: {
            "heatmap-weight": ["get", "peso"], "heatmap-radius": 45, "heatmap-intensity": 1.1, "heatmap-opacity": 0.7,
            "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.3, "#fcf3e4", 0.6, "#f2a33a", 0.85, "#d93a3a", 1, "#a11d1d"],
          },
        });

        map.addSource("rutas", { type: "geojson", data: geo([]) });
        map.addLayer({ id: "rutas", type: "line", source: "rutas", paint: { "line-color": ["get", "color"], "line-width": 3, "line-dasharray": [2, 1.5] } });
        map.addSource("camiones", { type: "geojson", data: geo([]) });
        map.addLayer({ id: "camiones", type: "circle", source: "camiones", paint: { "circle-radius": 7, "circle-color": "#12a150", "circle-stroke-color": "#fff", "circle-stroke-width": 2.5 } });

        map.addSource("cierres", { type: "geojson", data: geo([]) });
        map.addLayer({ id: "cierres", type: "line", source: "cierres", paint: { "line-color": "#d93a3a", "line-width": 6, "line-opacity": 0.85 } });

        // Reportes: columna de color + halo que late + punto
        map.addSource("columnas", { type: "geojson", data: geo([]) });
        map.addLayer({
          id: "columnas", type: "fill-extrusion", source: "columnas",
          paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "alto"], "fill-extrusion-opacity": 0.9 },
        });
        map.addSource("puntos", { type: "geojson", data: geo([]) });
        map.addLayer({ id: "halo", type: "circle", source: "puntos", paint: { "circle-radius": 12, "circle-color": ["get", "color"], "circle-opacity": 0.22, "circle-blur": 0.6 } });
        map.addLayer({
          id: "nucleo", type: "circle", source: "puntos",
          paint: { "circle-radius": 5, "circle-color": ["get", "color"], "circle-stroke-color": "#fff", "circle-stroke-width": 2 },
        });
        map.on("click", "nucleo", (e) => {
          const id = (e.features?.[0] as { properties?: { id?: string } } | undefined)?.properties?.id;
          if (id) window.dispatchEvent(new CustomEvent("centro:elegir", { detail: id }));
        });
        map.on("mouseenter", "nucleo", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "nucleo", () => { map.getCanvas().style.cursor = ""; });

        setListo(true);

        const animar = (t: number) => {
          if (!vivo) return;
          const pulso = 11 + Math.sin(t / 320) * 5;
          if (map.getLayer("halo")) map.setPaintProperty("halo", "circle-radius", ["case", ["get", "nuevo"], pulso * 2.2, pulso]);
          if (girarRef.current && Date.now() - ultimoToque.current > 15_000 && !map.isMoving()) map.setBearing(map.getBearing() + 0.04);
          window.dispatchEvent(new CustomEvent("centro:cuadro", { detail: t }));
          anim = requestAnimationFrame(animar);
        };
        anim = requestAnimationFrame(animar);
      });
    });
    return () => { vivo = false; cancelAnimationFrame(anim); mapa.current?.remove(); mapa.current = null; };
  }, []);

  // Reportes en el mapa
  useEffect(() => {
    const map = mapa.current;
    if (!listo || !map) return;
    const pts = visibles.map((r): Rasgo => ({
      type: "Feature", geometry: { type: "Point", coordinates: [r.lng!, r.lat!] },
      properties: { id: r.id, color: COLOR_TIPO[r.tipo], nuevo: Boolean(r.nuevo) },
    }));
    const cols = visibles.filter(abierto).map((r): Rasgo => ({
      type: "Feature", geometry: { type: "Polygon", coordinates: cuadro(r.lng!, r.lat!) },
      properties: { color: COLOR_TIPO[r.tipo], alto: ALTURA_URGENCIA[urgenciaDe(r)] },
    }));
    const calor = reportes.filter((r) => abierto(r) && r.lat !== null).map((r): Rasgo => ({
      type: "Feature", geometry: { type: "Point", coordinates: [r.lng!, r.lat!] },
      properties: { peso: urgenciaDe(r) === "alta" ? 2 : 1 },
    }));
    (map.getSource("puntos") as GeoJSONSource).setData(geo(pts));
    (map.getSource("columnas") as GeoJSONSource).setData(geo(cols));
    (map.getSource("calor") as GeoJSONSource).setData(geo(calor));
  }, [listo, visibles, reportes]);

  // Rutas, camión y cierres
  useEffect(() => {
    const map = mapa.current;
    if (!listo || !map) return;
    const trazos = rutas.map((r) => (r.trazo.length > 1 ? r.trazo : r.puntos)).filter((t) => t.length > 1);
    (map.getSource("rutas") as GeoJSONSource).setData(geo(trazos.map((t, i): Rasgo => ({
      type: "Feature", geometry: { type: "LineString", coordinates: [...t, t[0]].map((p) => [p.lng, p.lat]) },
      properties: { color: rutas[i]?.color ?? "#12a150" },
    }))));
    const c = centro();
    (map.getSource("cierres") as GeoJSONSource).setData(geo(firebaseListo ? [] : [{
      type: "Feature", properties: {},
      geometry: { type: "LineString", coordinates: [[c.lng - 0.0024, c.lat + 0.0007], [c.lng + 0.0001, c.lat + 0.0007]] },
    }]));
    const mover = (e: Event) => {
      const t = (e as CustomEvent<number>).detail;
      (map.getSource("camiones") as GeoJSONSource | undefined)?.setData(geo(trazos.map((tr, i): Rasgo => {
        const p = enRuta([...tr, tr[0]], ((t / 60_000) + i * 0.37) % 1);
        return { type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: {} };
      })));
    };
    window.addEventListener("centro:cuadro", mover);
    return () => window.removeEventListener("centro:cuadro", mover);
  }, [listo, rutas]);

  // Capas
  useEffect(() => {
    const map = mapa.current;
    if (!listo || !map) return;
    const ver = (ids: string[], si: boolean) => ids.forEach((id) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", si ? "visible" : "none"));
    ver(["edificios-3d"], capas.edificios);
    ver(["calor"], capas.calor);
    ver(["rutas", "camiones"], capas.basura);
    ver(["cierres"], capas.cierres);
  }, [listo, capas]);

  // ── Acciones ──────────────────────────────────────────────────────────
  const volarA = useCallback((p: Punto, zoom = 17.2) => {
    ultimoToque.current = Date.now();
    mapa.current?.flyTo({ center: [p.lng, p.lat], zoom, pitch: 62, duration: 2400, essential: true });
  }, []);

  const elegir = useCallback((id: string) => {
    const r = reportes.find((x) => x.id === id);
    if (!r || r.lat === null || r.lng === null) return;
    volarA({ lng: r.lng, lat: r.lat }, 18);
    setMensaje(`${r.folio} · ${ETIQUETA_REPORTE[r.tipo]} en ${r.colonia}${r.direccion ? `, ${r.direccion}` : ""}. ${ETIQUETA_ESTADO_REPORTE[r.estado]} · urgencia ${urgenciaDe(r)}. ${r.descripcion}`);
  }, [reportes, volarA]);

  useEffect(() => {
    const h = (e: Event) => elegir((e as CustomEvent<string>).detail);
    window.addEventListener("centro:elegir", h);
    return () => window.removeEventListener("centro:elegir", h);
  }, [elegir]);

  const ejecutar = useCallback((o: Orden) => {
    if (o.accion === "informe") { decir(narrar(resumen, municipio)); return; }
    if (o.accion === "todo") { setFiltro({}); volarA(centro(), 15.6); decir(o.respuesta); return; }
    if (o.accion === "capa" && o.capa) { setCapas((c) => ({ ...c, [o.capa!]: o.encender ?? true })); decir(o.respuesta); return; }
    if (o.accion === "filtrar") setFiltro({ tipo: o.tipo, urgencia: o.urgencia, estado: o.estado, colonia: o.colonia });
    const col = cfg().colonias.find((c) => c.nombre === o.colonia);
    if (col && typeof col.lat === "number" && typeof col.lng === "number") volarA({ lng: col.lng, lat: col.lat }, 16.6);
    const cuantos = reportes.filter((r) => aplicaFiltro(r, o)).length;
    decir(o.accion === "filtrar" ? `${o.respuesta} ${cuantos === 1 ? "Hay 1." : `Hay ${cuantos}.`}` : o.respuesta);
  }, [decir, municipio, reportes, resumen, volarA]);

  const enviarOrden = useCallback(async (texto: string) => {
    const t = texto.trim();
    if (!t) return;
    setOrden("");
    // Con llave de IA y sesión real, Claude interpreta; si no, el intérprete local
    const usuario = auth?.currentUser;
    if (firebaseListo && usuario) {
      try {
        const res = await fetch("/api/centro/orden", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${await usuario.getIdToken()}` },
          body: JSON.stringify({ texto: t, colonias }),
        });
        if (res.ok) {
          const { orden: o } = (await res.json()) as { orden: Orden };
          setMotor("ia");
          ejecutar(o);
          return;
        }
      } catch { /* sin red: intérprete local */ }
    }
    setMotor("local");
    ejecutar(interpretarOrden(t, colonias));
  }, [colonias, ejecutar]);

  const escuchar = useCallback(() => {
    type Reconocedor = { lang: string; interimResults: boolean; start: () => void; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; onerror: () => void };
    const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
    const R = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!R) { setMensaje("Este navegador no permite dar órdenes por voz. Usa Chrome o Safari, o escribe la orden."); return; }
    const rec = new R();
    rec.lang = "es-MX";
    rec.interimResults = false;
    rec.onresult = (e) => { const texto = e.results[0][0].transcript; setOrden(texto); void enviarOrden(texto); };
    rec.onend = () => setEscuchando(false);
    rec.onerror = () => setEscuchando(false);
    setEscuchando(true);
    rec.start();
  }, [enviarOrden]);

  const pantallaCompleta = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void marco.current?.requestFullscreen();
    setTimeout(() => mapa.current?.resize(), 300);
  };

  const hayFiltro = Boolean(filtro.tipo || filtro.urgencia || filtro.estado || filtro.colonia);

  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="col" style={{ gap: 2 }}>
          <h3 className="h3">Centro de mando · {municipio}</h3>
          <span className="muted" style={{ fontSize: 12 }}>
            Reportes en vivo sobre el mapa 3D{!firebaseListo && " · datos de demostración (entra un reporte simulado cada 25 s)"}
          </span>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn ghost" onClick={() => decir(narrar(resumen, municipio))}>Informe del día</button>
          <button type="button" className="btn ghost" onClick={() => setCatastro(true)}>Modelo 3D de Catastro</button>
          <button type="button" className="btn ghost" onClick={() => { setVozActiva((v) => !v); window.speechSynthesis?.cancel(); }}>Voz: {vozActiva ? "sí" : "no"}</button>
          <button type="button" className="btn primary" onClick={pantallaCompleta}>Pantalla completa</button>
        </div>
      </div>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <Kpi n={resumen.abiertos} t="Por atender" s={`${resumen.porTipo[0] ? `Más: ${ETIQUETA_REPORTE[resumen.porTipo[0].tipo].toLowerCase()}` : "Sin pendientes"}`} />
        <Kpi n={resumen.urgentes} t="Urgentes" s="Urgencia alta" />
        <Kpi n={resumen.nuevosHoy} t="Nuevos hoy" s="Últimas 24 horas" />
        <Kpi n={resumen.respuestaHoras !== null ? `${resumen.respuestaHoras} h` : "—"} t="Primera respuesta" s="Promedio" />
        <Kpi n={resumen.coloniaCritica?.nombre ?? "—"} t="Zona con más pendientes" s={resumen.coloniaCritica ? `${resumen.coloniaCritica.abiertos} por atender` : ""} />
      </div>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <div className="card grow col" style={{ gap: 12 }}>
          <div ref={marco} className={s.mapaCaja}>
            {MAPBOX_TOKEN
              ? <div ref={caja} className={s.mapa} />
              : <div className="muted" style={{ padding: 24 }}>El mapa necesita el token de Mapbox (NEXT_PUBLIC_MAPBOX_TOKEN).</div>}
            <div className={s.sobreMapa}>
              <div className={`${s.flotante} chips`} style={{ gap: 6 }}>
                {(Object.keys(NOMBRE_CAPA) as Capa[]).map((c) => (
                  <button key={c} type="button" className="chip" aria-pressed={capas[c]}
                    style={capas[c] ? { background: "var(--brand)", color: "#fff" } : undefined}
                    onClick={() => setCapas((x) => ({ ...x, [c]: !x[c] }))}>
                    {NOMBRE_CAPA[c]}
                  </button>
                ))}
              </div>
              <button type="button" className={`${s.flotante} chip`} aria-pressed={girar} onClick={() => setGirar((g) => !g)}>
                {girar ? "Giro automático: sí" : "Giro automático: no"}
              </button>
            </div>
            <div className={`${s.leyenda} ${s.flotante}`}>
              {TIPOS.map((t) => <span key={t}><span className={s.punto} style={{ background: COLOR_TIPO[t] }} />{ETIQUETA_REPORTE[t]}</span>)}
              <span>· Más alta = más urgente</span>
            </div>
          </div>

          <form className="row" style={{ gap: 8, alignItems: "center" }} onSubmit={(e) => { e.preventDefault(); void enviarOrden(orden); }}>
            <input className="input grow" value={orden} onChange={(e) => setOrden(e.target.value)}
              placeholder="Da una orden: «fugas urgentes», «vuela a San Miguel Norte», «muestra zonas críticas», «informe»"
              aria-label="Orden para el centro de mando" />
            <button type="button" className={`btn ghost ${escuchando ? s.escuchando : ""}`} onClick={escuchar} aria-label="Dar la orden por voz">
              {escuchando ? "Escuchando…" : "🎙 Hablar"}
            </button>
            <button type="submit" className="btn primary">Enviar</button>
          </form>
          <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className={`tag ${motor === "ia" ? "azul" : "gris"}`}>{motor === "ia" ? "IA · Claude" : "Intérprete local"}</span>
            {hayFiltro && (
              <button type="button" className="chip" onClick={() => ejecutar({ accion: "todo", respuesta: "Mostrando todos los reportes." })}>
                Quitar filtro ✕
              </button>
            )}
            {mensaje && <span style={{ fontSize: 13 }} role="status" aria-live="polite">{mensaje}</span>}
          </div>
        </div>

        <div className={`card col ${s.lateral}`} style={{ gap: 10, width: 340, flex: "0 0 340px" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="h3">En vivo</h3>
            <span className="tag azul">{recientes.length} por atender</span>
          </div>
          <div className={s.lista}>
            {recientes.map((r) => (
              <button key={r.id} type="button" className={`acard ${s.item} ${r.nuevo ? s.nuevo : ""}`}
                style={{ borderLeftColor: COLOR_TIPO[r.tipo] }} onClick={() => r.id && elegir(r.id)}>
                <div className="row" style={{ justifyContent: "space-between", gap: 6 }}>
                  <span className="t">{ETIQUETA_REPORTE[r.tipo]}</span>
                  {r.nuevo ? <span className="tag azul">Nuevo</span> : urgenciaDe(r) === "alta" ? <span className="tag rojo">Urgente</span> : null}
                </div>
                <span className="s">{r.colonia} · {haceTexto(r.creadoEn)} · {r.folio}</span>
              </button>
            ))}
            {!recientes.length && <span className="muted">No hay reportes por atender.</span>}
          </div>
        </div>
      </div>

      {catastro && (
        <Modal titulo="Modelo 3D de Teocaltiche" ancho={1100} onCerrar={() => setCatastro(false)}>
          <iframe className={s.marco} src={MODELO_CATASTRO} title="Modelo 3D de Teocaltiche (Catastro Jalisco)" />
          <span className="muted" style={{ fontSize: 12 }}>Modelo 3D: Dirección de Catastro del Gobierno del Estado de Jalisco, 2020.</span>
        </Modal>
      )}
    </div>
  );
}

/** Punto a una fracción (0..1) del recorrido */
function enRuta(puntos: Punto[], t: number): Punto {
  if (puntos.length < 2) return puntos[0] ?? centro();
  const tramos = puntos.slice(1).map((p, i) => Math.hypot(p.lng - puntos[i].lng, p.lat - puntos[i].lat));
  let falta = tramos.reduce((a, b) => a + b, 0) * t;
  for (let i = 0; i < tramos.length; i++) {
    if (falta <= tramos[i]) {
      const f = tramos[i] ? falta / tramos[i] : 0;
      return { lng: puntos[i].lng + (puntos[i + 1].lng - puntos[i].lng) * f, lat: puntos[i].lat + (puntos[i + 1].lat - puntos[i].lat) * f };
    }
    falta -= tramos[i];
  }
  return puntos[puntos.length - 1];
}
