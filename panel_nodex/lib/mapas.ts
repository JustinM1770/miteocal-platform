/* Mapas (Mapbox). Las coordenadas van como { lng, lat } porque Firestore
   no acepta arreglos anidados. */

export interface Punto { lng: number; lat: number }

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/** Centro del municipio de esta instalación (lng,lat). Teocaltiche por defecto. */
export const CENTRO: Punto = (() => {
  const [lng, lat] = (process.env.NEXT_PUBLIC_MUNICIPIO_CENTRO ?? "-102.5764,21.4271").split(",").map(Number);
  return { lng, lat };
})();

/** Une los puntos siguiendo las calles (Mapbox Directions, perfil de manejo) */
export async function trazarPorCalles(puntos: Punto[]): Promise<{ trazo: Punto[]; metros: number } | null> {
  if (puntos.length < 2 || !MAPBOX_TOKEN) return null;
  const trazo: Punto[] = [];
  let metros = 0;
  // La API acepta hasta 25 puntos por llamada; se encadenan tramos
  for (let i = 0; i < puntos.length - 1; i += 24) {
    const tramo = puntos.slice(i, i + 25);
    const coords = tramo.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
    const r = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`);
    if (!r.ok) return null;
    const j = await r.json();
    const ruta = j.routes?.[0];
    if (!ruta) return null;
    metros += ruta.distance;
    const c: [number, number][] = ruta.geometry.coordinates;
    trazo.push(...c.slice(trazo.length ? 1 : 0).map(([lng, lat]) => ({ lng, lat })));
  }
  return { trazo, metros };
}

export function distancia(a: Punto, b: Punto): number {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Avance (0–1) a lo largo del trazo de cada vértice */
export function avances(trazo: Punto[]): number[] {
  const acum = [0];
  for (let i = 1; i < trazo.length; i++) acum.push(acum[i - 1] + distancia(trazo[i - 1], trazo[i]));
  const total = acum[acum.length - 1] || 1;
  return acum.map((d) => d / total);
}

/** Vértice del trazo más cercano a un punto, con su distancia en metros */
export function masCercano(trazo: Punto[], p: Punto): { i: number; metros: number } {
  let i = 0, m = Infinity;
  trazo.forEach((q, k) => { const d = distancia(p, q); if (d < m) { m = d; i = k; } });
  return { i, metros: m };
}

/** Hora estimada en que el camión llega a una fracción del recorrido */
export function horaEn(inicio: string, fin: string, fraccion: number): string {
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  const t = hi * 60 + mi + Math.round(((hf * 60 + mf) - (hi * 60 + mi)) * fraccion);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export const aJSON = (l: Punto[]) => JSON.stringify(l.map((p) => [+p.lng.toFixed(6), +p.lat.toFixed(6)]));
export const deJSON = (s?: string): Punto[] => {
  try { return s ? (JSON.parse(s) as [number, number][]).map(([lng, lat]) => ({ lng, lat })) : []; } catch { return []; }
};
