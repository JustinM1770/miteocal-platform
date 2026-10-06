"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker, Popup, GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { CENTRO, MAPBOX_TOKEN, type Punto } from "@/lib/mapas";

export interface Linea { id: string; puntos: Punto[]; color: string; ancho?: number; punteada?: boolean }
export interface Marcador { id: string; punto: Punto; color: string; texto?: string; onClick?: () => void }
export interface Globo { punto: Punto; titulo: string; lineas: string[] }

/* Mapa declarativo: las props describen qué se ve y el componente sincroniza
   Mapbox. `ajustar` encuadra el mapa cuando cambia su `clave`. */
export default function Mapa({
  lineas = [], marcadores = [], globo = null, onClick, ajustar, alto = 420, zoom = 14.5, editando = false,
}: {
  lineas?: Linea[];
  marcadores?: Marcador[];
  globo?: Globo | null;
  onClick?: (p: Punto) => void;
  ajustar?: { clave: string; puntos: Punto[] };
  alto?: number | string;
  zoom?: number;
  editando?: boolean;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapboxMap | null>(null);
  const lib = useRef<typeof import("mapbox-gl") | null>(null);
  const pines = useRef<Marker[]>([]);
  const popup = useRef<Popup | null>(null);
  const clic = useRef(onClick);
  const [listo, setListo] = useState(false);
  clic.current = onClick;

  useEffect(() => {
    if (!MAPBOX_TOKEN || !caja.current) return;
    let vivo = true;
    import("mapbox-gl").then((m) => {
      if (!vivo || !caja.current) return;
      const mb = m.default;
      lib.current = m;
      mb.accessToken = MAPBOX_TOKEN;
      const map = new mb.Map({ container: caja.current, style: "mapbox://styles/mapbox/streets-v12", center: [CENTRO.lng, CENTRO.lat], zoom, attributionControl: false });
      map.addControl(new mb.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new mb.AttributionControl({ compact: true }));
      map.on("click", (e) => clic.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat }));
      map.on("load", () => {
        map.addSource("lineas", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        const base = { type: "line" as const, source: "lineas", layout: { "line-cap": "round" as const, "line-join": "round" as const } };
        map.addLayer({ ...base, id: "lineas-borde", paint: { "line-color": "#ffffff", "line-width": ["+", ["get", "ancho"], 3] } });
        map.addLayer({ ...base, id: "lineas", filter: ["!=", ["get", "punteada"], true], paint: { "line-color": ["get", "color"], "line-width": ["get", "ancho"] } });
        map.addLayer({ ...base, id: "lineas-punteadas", filter: ["==", ["get", "punteada"], true], paint: { "line-color": ["get", "color"], "line-width": ["get", "ancho"], "line-dasharray": [1.5, 1.5] } });
        setListo(true);
      });
      mapa.current = map;
    });
    return () => { vivo = false; mapa.current?.remove(); mapa.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Líneas
  useEffect(() => {
    if (!listo || !mapa.current) return;
    (mapa.current.getSource("lineas") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: lineas.filter((l) => l.puntos.length > 1).map((l) => ({
        type: "Feature", properties: { color: l.color, ancho: l.ancho ?? 5, punteada: Boolean(l.punteada) },
        geometry: { type: "LineString", coordinates: l.puntos.map((p) => [p.lng, p.lat]) },
      })),
    });
  }, [listo, lineas]);

  // Marcadores
  useEffect(() => {
    if (!listo || !mapa.current || !lib.current) return;
    pines.current.forEach((p) => p.remove());
    pines.current = marcadores.map((m) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "pin-mapa";
      el.style.background = m.color;
      el.textContent = m.texto ?? "";
      if (m.onClick) el.addEventListener("click", (e) => { e.stopPropagation(); m.onClick!(); });
      return new lib.current!.default.Marker({ element: el }).setLngLat([m.punto.lng, m.punto.lat]).addTo(mapa.current!);
    });
  }, [listo, marcadores]);

  // Globo de información
  useEffect(() => {
    if (!listo || !mapa.current || !lib.current) return;
    popup.current?.remove();
    if (!globo) return;
    const el = document.createElement("div");
    const t = document.createElement("strong"); t.textContent = globo.titulo; el.appendChild(t);
    for (const l of globo.lineas) { const d = document.createElement("div"); d.textContent = l; d.style.fontSize = "12px"; d.style.color = "#5a6270"; el.appendChild(d); }
    popup.current = new lib.current.default.Popup({ offset: 18, closeButton: false, maxWidth: "260px" }).setLngLat([globo.punto.lng, globo.punto.lat]).setDOMContent(el).addTo(mapa.current);
  }, [listo, globo]);

  // Encuadre
  const clave = ajustar?.clave;
  useEffect(() => {
    if (!listo || !mapa.current || !lib.current || !ajustar?.puntos.length) return;
    if (ajustar.puntos.length === 1) { mapa.current.flyTo({ center: [ajustar.puntos[0].lng, ajustar.puntos[0].lat], zoom: 16.5 }); return; }
    const b = new lib.current.default.LngLatBounds();
    ajustar.puntos.forEach((p) => b.extend([p.lng, p.lat]));
    mapa.current.fitBounds(b, { padding: 60, maxZoom: 16.5, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, clave]);

  useEffect(() => { if (mapa.current) mapa.current.getCanvas().style.cursor = editando ? "crosshair" : ""; }, [editando, listo]);

  if (!MAPBOX_TOKEN) {
    return <div className="mapa-vacio" style={{ height: alto }}>Falta NEXT_PUBLIC_MAPBOX_TOKEN en .env.local para mostrar el mapa.</div>;
  }
  return <div ref={caja} className="mapa-real" style={{ height: alto }} />;
}
