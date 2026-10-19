import { azar } from "./almacen";

/* Retratos ilustrados para los DATOS DE EJEMPLO (modo demo). No son fotos de
   personas reales: en producción cada candidata sube su foto a Storage. */

const PIEL = ["#f1c7a5", "#e0ac83", "#c98e63", "#a8714b", "#8a5a3b"];
const PELO = ["#2b1b14", "#3b2416", "#5a3a22", "#7a4b2a", "#1a1110"];
const VESTIDO = ["#d93a3a", "#1552e0", "#6b3db8", "#12a150", "#c77700", "#d6336c"];
const FONDO = ["#fde8cf", "#dfe7fb", "#f6d5e4", "#dcf2e4", "#ece4fb"];

export function retrato(semilla: number, corona = false, nina = false): string {
  const a = azar(semilla * 7919 + 13);
  const piel = a.de(PIEL), pelo = a.de(PELO), vestido = a.de(VESTIDO), fondo = a.de(FONDO);
  const largo = a.r() < 0.7;
  const escala = nina ? 0.88 : 1;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240">
  <rect width="200" height="240" fill="${fondo}"/>
  <g transform="translate(100 130) scale(${escala}) translate(-100 -130)">
    ${largo ? `<path d="M52 100 Q50 60 100 48 Q150 60 148 100 L156 190 Q100 205 44 190 Z" fill="${pelo}"/>` : ""}
    <path d="M40 240 Q46 178 100 170 Q154 178 160 240 Z" fill="${vestido}"/>
    <rect x="86" y="140" width="28" height="36" rx="10" fill="${piel}"/>
    <ellipse cx="100" cy="108" rx="40" ry="46" fill="${piel}"/>
    <path d="M58 104 Q58 58 100 56 Q142 58 142 104 Q130 76 100 74 Q72 76 58 104 Z" fill="${pelo}"/>
    <ellipse cx="85" cy="110" rx="4.5" ry="5.5" fill="#2b1b14"/>
    <ellipse cx="115" cy="110" rx="4.5" ry="5.5" fill="#2b1b14"/>
    <ellipse cx="76" cy="124" rx="7" ry="4" fill="#e8908a" opacity=".45"/>
    <ellipse cx="124" cy="124" rx="7" ry="4" fill="#e8908a" opacity=".45"/>
    <path d="M88 130 Q100 140 112 130" stroke="#a3443e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    ${corona ? `<path d="M70 62 L76 34 L88 52 L100 28 L112 52 L124 34 L130 62 Z" fill="#e3a008" stroke="#b77d00" stroke-width="2"/><circle cx="100" cy="44" r="4" fill="#d93a3a"/>` : `<circle cx="132" cy="80" r="9" fill="${a.de(VESTIDO)}" opacity=".9"/>`}
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
