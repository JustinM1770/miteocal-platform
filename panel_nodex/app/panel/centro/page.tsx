"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
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

/* Centro de mando estilo sala de control: Teocaltiche en 3D con los reportes
   como columnas de luz. Pensado para una pantalla grande en la oficina. */

const MODELO_CATASTRO = "https://catastro.jalisco.gob.mx/modelados/Teocaltiche-0001_3D_2020/app/noborders.html";
const NOMBRE_CAPA: Record<Capa, string> = { edificios: "Edificios 3D", calor: "Zonas críticas", basura: "Camión de basura", cierres: "Cierres" };

type ConMarca = Reporte & { nuevo?: boolean };

// En el demo los reportes nuevos se simulan para ver el centro "en vivo"
const TIPOS_DEMO: TipoReporte[] = ["fuga", "bache", "luminaria", "basura", "drenaje", "fuga", "bache"];

function reporteSimulado(n: number): ConMarca {
  const colonias = cfg().colonias.filter((c) => typeof c.lat === "number");
  const c = colonias[Math.floor(Math.random() * colonias.length)];
  const tipo = TIPOS_DEMO[Math.floor(Math.random() * TIPOS_DEMO.length)];
  return {
    id: `sim-${Date.now()}`, folio: `TEC-${9000 + n}`, tipo, colonia: c?.nombre ?? "Centro", direccion: "",
    descripcion: "Reporte simulado para el demo", fotoUrl: null,
    lat: (c?.lat ?? 21.4271) + (Math.random() - 0.5) * 0.004, lng: (c?.lng ?? -102.5764) + (Math.random() - 0.5) * 0.004,
    estado: "recibido", respuesta: null, vecinoNombre: "Vecino", historial: [], creadoEn: new Date(), nuevo: true,
  };
}

type Geometria =
  | { type: "Point"; coordinates: number[] }
  | { type: "LineString"; coordinates: number[][] }
  | { type: "Polygon"; coordinates: number[][][] };
type Rasgo = { type: "Feature"; geometry: Geometria; properties: Record<string, unknown> };

const geo = (features: Rasgo[]) => ({ type: "FeatureCollection" as const, features });

export default function CentroDeMando() {
  const router = useRouter();
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
  const [ahora, setAhora] = useState(() => new Date());
  const ultimoToque = useRef(0);
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
    const reloj = setInterval(() => setAhora(new Date()), 1000);
    // Demo: cada 25 s entra un reporte
    const sim = firebaseListo ? null : setInterval(() => {
      simulados.current += 1;
      setReportes((prev) => [reporteSimulado(simulados.current), ...prev.map((x) => ({ ...x, nuevo: false }))]);
    }, 25_000);
    return () => { vivo = false; clearInterval(datos); clearInterval(reloj); if (sim) clearInterval(sim); };
  }, []);

  const visibles = useMemo(() => reportes.filter((r) => r.lat !== null && r.lng !== null && aplicaFiltro(r, filtro)), [reportes, filtro]);
  const resumen = useMemo(() => informe(reportes, ahora), [reportes, ahora]);

  // ── Hablar ────────────────────────────────────────────────────────────
  const decir = useCallback((texto: string) => {
    setMensaje(texto);
    if (!vozActiva || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-MX";
    u.rate = 1.02;
    const voz = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("es"));
    if (voz) u.voice = voz;
    window.speechSynthesis.speak(u);
  }, [vozActiva]);

  // ── Mapa ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!MAPBOX_TOKEN || !caja.current) return;
    let vivo = true;
    let cuadroAnim = 0;
    import("mapbox-gl").then((m) => {
      if (!vivo || !caja.current) return;
      const mb = m.default;
      mb.accessToken = MAPBOX_TOKEN;
      const c = centro();
      const map = new mb.Map({
        container: caja.current, style: "mapbox://styles/mapbox/dark-v11",
        center: [c.lng, c.lat], zoom: 15.6, pitch: 62, bearing: -20, antialias: true, attributionControl: false,
      });
      map.addControl(new mb.AttributionControl({ compact: true }), "bottom-left");
      mapa.current = map;
      ["mousedown", "touchstart", "wheel", "dragstart"].forEach((e) => map.on(e as "mousedown", () => { ultimoToque.current = Date.now(); }));

      map.on("load", () => {
        // Relieve y niebla
        map.addSource("dem", { type: "raster-dem", url: "mapbox://mapbox.mapbox-terrain-dem-v1", tileSize: 512, maxzoom: 14 });
        map.setTerrain({ source: "dem", exaggeration: 1.4 });
        map.setFog({ color: "#050a14", "high-color": "#0b1d3a", "horizon-blend": 0.12, "space-color": "#02040a", "star-intensity": 0.35 });

        // Calles en azul brillante
        for (const capa of map.getStyle().layers ?? []) {
          if (capa.type === "line" && /road|street|bridge|tunnel/.test(capa.id)) {
            map.setPaintProperty(capa.id, "line-color", "#1d4ed8");
            map.setPaintProperty(capa.id, "line-opacity", 0.55);
          }
        }

        // Edificios tipo holograma
        map.addLayer({
          id: "edificios-3d", type: "fill-extrusion", source: "composite", "source-layer": "building", minzoom: 13,
          filter: ["==", ["get", "extrude"], "true"],
          paint: {
            "fill-extrusion-color": ["interpolate", ["linear"], ["get", "height"], 0, "#0b2a4a", 12, "#1e40af", 30, "#38bdf8"],
            "fill-extrusion-height": ["*", ["coalesce", ["get", "height"], 4], 1.2],
            "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
            "fill-extrusion-opacity": 0.55,
          },
        });
        map.addLayer({
          id: "edificios-borde", type: "line", source: "composite", "source-layer": "building", minzoom: 14,
          paint: { "line-color": "#38bdf8", "line-width": 0.6, "line-opacity": 0.45 },
        });

        // Zonas críticas
        map.addSource("calor", { type: "geojson", data: geo([]) });
        map.addLayer({
          id: "calor", type: "heatmap", source: "calor", layout: { visibility: "none" },
          paint: {
            "heatmap-weight": ["get", "peso"], "heatmap-radius": 45, "heatmap-intensity": 1.1, "heatmap-opacity": 0.7,
            "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.3, "#7c2d12", 0.6, "#ea580c", 0.85, "#f87171", 1, "#fecaca"],
          },
        });

        // Rutas de basura y camión
        map.addSource("rutas", { type: "geojson", data: geo([]) });
        map.addLayer({ id: "rutas-brillo", type: "line", source: "rutas", paint: { "line-color": ["get", "color"], "line-width": 9, "line-opacity": 0.18, "line-blur": 4 } });
        map.addLayer({ id: "rutas", type: "line", source: "rutas", paint: { "line-color": ["get", "color"], "line-width": 2.5, "line-dasharray": [2, 1.5] } });
        map.addSource("camiones", { type: "geojson", data: geo([]) });
        map.addLayer({ id: "camiones", type: "circle", source: "camiones", paint: { "circle-radius": 7, "circle-color": "#34d399", "circle-stroke-color": "#ecfdf5", "circle-stroke-width": 2 } });

        // Cierres
        map.addSource("cierres", { type: "geojson", data: geo([]) });
        map.addLayer({ id: "cierres", type: "line", source: "cierres", paint: { "line-color": "#ef4444", "line-width": 6, "line-opacity": 0.85 } });

        // Reportes: columna de luz + halo que late + núcleo
        map.addSource("columnas", { type: "geojson", data: geo([]) });
        map.addLayer({
          id: "columnas", type: "fill-extrusion", source: "columnas",
          paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "alto"], "fill-extrusion-opacity": 0.85 },
        });
        map.addSource("puntos", { type: "geojson", data: geo([]) });
        map.addLayer({ id: "halo", type: "circle", source: "puntos", paint: { "circle-radius": 14, "circle-color": ["get", "color"], "circle-opacity": 0.25, "circle-blur": 0.8 } });
        map.addLayer({
          id: "nucleo", type: "circle", source: "puntos",
          paint: { "circle-radius": 4, "circle-color": "#f0f9ff", "circle-stroke-color": ["get", "color"], "circle-stroke-width": 2 },
        });
        map.on("click", "nucleo", (e) => {
          const id = (e.features?.[0] as { properties?: { id?: string } } | undefined)?.properties?.id;
          if (id) window.dispatchEvent(new CustomEvent("centro:elegir", { detail: id }));
        });
        map.on("mouseenter", "nucleo", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "nucleo", () => { map.getCanvas().style.cursor = ""; });

        setListo(true);

        // Animación: halo que late, camión que avanza y giro lento si nadie toca
        const animar = (t: number) => {
          if (!vivo) return;
          const pulso = 12 + Math.sin(t / 320) * 6;
          if (map.getLayer("halo")) map.setPaintProperty("halo", "circle-radius", ["case", ["get", "nuevo"], pulso * 2.2, pulso]);
          if (Date.now() - ultimoToque.current > 15_000 && !map.isMoving()) map.setBearing(map.getBearing() + 0.04);
          window.dispatchEvent(new CustomEvent("centro:cuadro", { detail: t }));
          cuadroAnim = requestAnimationFrame(animar);
        };
        cuadroAnim = requestAnimationFrame(animar);
      });
    });
    return () => { vivo = false; cancelAnimationFrame(cuadroAnim); mapa.current?.remove(); mapa.current = null; };
  }, []);

  // Pintar reportes
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
    (map.getSource("puntos") as GeoJSONSource).setData(geo(pts));
    (map.getSource("columnas") as GeoJSONSource).setData(geo(cols));
    const calor = reportes.filter((r) => abierto(r) && r.lat !== null).map((r): Rasgo => ({
      type: "Feature", geometry: { type: "Point", coordinates: [r.lng!, r.lat!] },
      properties: { peso: urgenciaDe(r) === "alta" ? 2 : 1 },
    }));
    (map.getSource("calor") as GeoJSONSource).setData(geo(calor));
  }, [listo, visibles, reportes]);

  // Rutas, camiones y cierres
  useEffect(() => {
    const map = mapa.current;
    if (!listo || !map) return;
    const trazos = rutas.map((r) => (r.trazo.length > 1 ? r.trazo : r.puntos));
    (map.getSource("rutas") as GeoJSONSource).setData(geo(rutas.map((r, i): Rasgo => ({
      type: "Feature", geometry: { type: "LineString", coordinates: [...trazos[i], trazos[i][0]].map((p) => [p.lng, p.lat]) },
      properties: { color: r.color },
    }))));
    // Cierres de ejemplo en el centro mientras el panel no guarde trazos
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
    ver(["edificios-3d", "edificios-borde"], capas.edificios);
    ver(["calor"], capas.calor);
    ver(["rutas", "rutas-brillo", "camiones"], capas.basura);
    ver(["cierres"], capas.cierres);
  }, [listo, capas]);

  // ── Acciones ──────────────────────────────────────────────────────────
  const volarA = useCallback((p: Punto, zoom = 17.2) => {
    ultimoToque.current = Date.now();
    mapa.current?.flyTo({ center: [p.lng, p.lat], zoom, pitch: 64, duration: 2600, essential: true });
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
    if (o.accion === "capa" && o.capa) {
      setCapas((c) => ({ ...c, [o.capa!]: o.encender ?? true }));
      decir(o.respuesta);
      return;
    }
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

  const recientes = useMemo(
    () => [...reportes].filter(abierto).sort((a, b) => +new Date(b.creadoEn as Date) - +new Date(a.creadoEn as Date)).slice(0, 25),
    [reportes],
  );

  if (!MAPBOX_TOKEN) {
    return <div className={s.raiz}><div className={s.sinToken}>El centro de mando necesita el token de Mapbox (NEXT_PUBLIC_MAPBOX_TOKEN).</div></div>;
  }

  return (
    <div className={s.raiz}>
      <div ref={caja} className={s.mapa} />
      <div className={s.vineta} />

      <div className={s.arriba}>
        <div className={`${s.vidrio} ${s.titulo}`}>
          <div className={s.marca}>NODEX · CENTRO DE MANDO</div>
          <div className={s.municipio}>{municipio.toUpperCase()}</div>
          <div className={s.reloj}>
            {ahora.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })} · {ahora.toLocaleTimeString("es-MX")}
          </div>
          {!firebaseListo && <div className={s.demo}>DATOS DE DEMOSTRACIÓN</div>}
        </div>

        <div className={s.kpis}>
          <div className={`${s.vidrio} ${s.kpi}`}><div className={s.kpiValor}>{resumen.abiertos}</div><div className={s.kpiNombre}>Pendientes</div></div>
          <div className={`${s.vidrio} ${s.kpi} ${resumen.urgentes ? s.kpiAlerta : ""}`}><div className={s.kpiValor}>{resumen.urgentes}</div><div className={s.kpiNombre}>Urgentes</div></div>
          <div className={`${s.vidrio} ${s.kpi}`}><div className={s.kpiValor}>{resumen.nuevosHoy}</div><div className={s.kpiNombre}>Nuevos hoy</div></div>
          <div className={`${s.vidrio} ${s.kpi}`}><div className={s.kpiValor}>{resumen.respuestaHoras ?? "—"}<span style={{ fontSize: 13 }}> h</span></div><div className={s.kpiNombre}>1.ª respuesta</div></div>
        </div>

        <div className={s.botones}>
          <button type="button" className={s.boton} onClick={() => decir(narrar(resumen, municipio))}>Informe</button>
          <button type="button" className={s.boton} onClick={() => setCatastro(true)}>Modelo 3D real</button>
          <button type="button" className={`${s.boton} ${vozActiva ? s.botonActivo : ""}`} onClick={() => { setVozActiva((v) => !v); window.speechSynthesis?.cancel(); }}>
            Voz {vozActiva ? "sí" : "no"}
          </button>
          <button type="button" className={s.boton} onClick={() => router.push("/panel")}>Salir</button>
        </div>
      </div>

      {mensaje && (
        <div className={`${s.vidrio} ${s.voz}`} role="status" aria-live="polite">
          <div className={s.seccion}>CENTRO</div>
          {mensaje}
        </div>
      )}

      <div className={`${s.vidrio} ${s.feed}`}>
        <div className={s.seccion}>EN VIVO · {recientes.length} PENDIENTES</div>
        <div className={s.lista}>
          {recientes.map((r) => (
            <button key={r.id} type="button" className={`${s.item} ${r.nuevo ? s.itemNuevo : ""}`} style={{ borderLeftColor: COLOR_TIPO[r.tipo] }} onClick={() => r.id && elegir(r.id)}>
              <div className={s.itemTitulo}>
                <span>{ETIQUETA_REPORTE[r.tipo]}</span>
                {r.nuevo ? <span className={s.etiquetaNuevo}>NUEVO</span> : urgenciaDe(r) === "alta" ? <span style={{ color: "#f87171", fontSize: 11 }}>URGENTE</span> : null}
              </div>
              <div className={s.itemDetalle}>{r.colonia} · {haceTexto(r.creadoEn)} · {r.folio}</div>
            </button>
          ))}
        </div>
      </div>

      <div className={s.abajo}>
        <div className={`${s.vidrio} ${s.capas}`}>
          {(Object.keys(NOMBRE_CAPA) as Capa[]).map((c) => (
            <button key={c} type="button" className={`${s.capa} ${capas[c] ? s.capaActiva : ""}`} onClick={() => setCapas((x) => ({ ...x, [c]: !x[c] }))}>
              {NOMBRE_CAPA[c]}
            </button>
          ))}
          {(filtro.tipo || filtro.urgencia || filtro.estado || filtro.colonia) && (
            <button type="button" className={s.capa} onClick={() => ejecutar({ accion: "todo", respuesta: "Mostrando todos los reportes." })}>Quitar filtro ✕</button>
          )}
        </div>
        <form className={`${s.vidrio} ${s.orden}`} onSubmit={(e) => { e.preventDefault(); void enviarOrden(orden); }}>
          <input
            className={s.entrada} value={orden} onChange={(e) => setOrden(e.target.value)}
            placeholder="Da una orden: «fugas urgentes», «vuela a San Miguel Norte», «muestra zonas críticas», «informe»"
            aria-label="Orden para el centro de mando"
          />
          <button type="button" className={`${s.boton} ${s.microfono} ${escuchando ? s.escuchando : ""}`} onClick={escuchar} aria-label="Dar la orden por voz">🎙</button>
          <button type="submit" className={s.boton}>Enviar</button>
          <span className={s.motor}>{motor === "ia" ? "IA · Claude" : "intérprete local"}</span>
        </form>
      </div>

      {catastro && (
        <div className={s.velo} onClick={() => setCatastro(false)}>
          <div className={`${s.vidrio} ${s.ventana}`} onClick={(e) => e.stopPropagation()}>
            <div className={s.ventanaBarra}>
              <span className={s.credito}>Modelo 3D: Dirección de Catastro del Gobierno del Estado de Jalisco, 2020</span>
              <button type="button" className={s.boton} onClick={() => setCatastro(false)}>Cerrar</button>
            </div>
            <iframe className={s.marco} src={MODELO_CATASTRO} title="Modelo 3D de Teocaltiche (Catastro Jalisco)" />
          </div>
        </div>
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
