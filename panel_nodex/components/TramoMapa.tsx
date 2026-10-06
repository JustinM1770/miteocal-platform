"use client";

import { useEffect, useMemo, useState } from "react";
import Mapa from "@/components/Mapa";
import { aJSON, deJSON, trazarPorCalles, type Punto } from "@/lib/mapas";

/** Campo de formulario: marcar en el mapa un tramo de calle (cierres y obras) */
export default function TramoMapa({ valor, onCambio }: { valor: string; onCambio: (v: string) => void }) {
  const [puntos, setPuntos] = useState<Punto[]>(() => {
    const t = deJSON(valor);
    return t.length > 1 ? [t[0], t[t.length - 1]] : [];
  });
  const [ajustando, setAjustando] = useState(false);
  const trazo = useMemo(() => deJSON(valor), [valor]);

  // El formulario se limpia al publicar: también los puntos
  useEffect(() => { if (!valor) setPuntos([]); }, [valor]);

  async function poner(nuevos: Punto[]) {
    setPuntos(nuevos);
    if (nuevos.length < 2) { onCambio(""); return; }
    setAjustando(true);
    const t = await trazarPorCalles(nuevos);
    onCambio(aJSON(t?.trazo ?? nuevos));
    setAjustando(false);
  }

  const lineas = useMemo(() => [{ id: "tramo", puntos: trazo, color: "#d93a3a", ancho: 7 }], [trazo]);
  const marcadores = useMemo(() => puntos.map((p, i) => ({ id: `t${i}`, punto: p, color: i === 0 ? "#12a150" : "#d93a3a", texto: i === 0 ? "A" : "B" })), [puntos]);

  return (
    <div className="col" style={{ gap: 8 }}>
      <Mapa alto={260} lineas={lineas} marcadores={marcadores} editando
        onClick={(p) => poner(puntos.length >= 2 ? [p] : [...puntos, p])}
        ajustar={trazo.length > 1 ? { clave: "inicial", puntos: trazo } : undefined} />
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <span className="muted" style={{ fontSize: 12 }}>
          {ajustando ? "Ajustando a la calle…" : puntos.length === 0 ? "Toca dónde empieza el cierre (A)." : puntos.length === 1 ? "Ahora toca dónde termina (B)." : "Listo. Toca otra vez para marcar un tramo nuevo."}
        </span>
        {puntos.length > 0 && <button className="btn ghost" style={{ padding: "5px 10px" }} type="button" onClick={() => poner([])}>Borrar</button>}
      </div>
    </div>
  );
}
