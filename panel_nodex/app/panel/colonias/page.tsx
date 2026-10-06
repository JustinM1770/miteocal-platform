"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COLONIAS, ZONAS, ETIQUETA_ESTADO, haceTexto, ultimaDeTipo, type Publicacion } from "@/lib/datos";

export default function Colonias() {
  const router = useRouter();
  const [agua, setAgua] = useState<Record<string, Publicacion | null>>({});

  useEffect(() => {
    Promise.all(COLONIAS.map((c) => ultimaDeTipo("agua", c.nombre)))
      .then((l) => setAgua(Object.fromEntries(COLONIAS.map((c, i) => [c.nombre, l[i]]))));
  }, []);

  const total = COLONIAS.reduce((s, c) => s + c.vecinos, 0);

  return (
    <div className="card col" style={{ gap: 0, paddingBottom: 8 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", paddingBottom: 12 }}>
        <div className="col" style={{ gap: 2 }}>
          <h3 className="h3">Colonias</h3>
          <span className="muted" style={{ fontSize: 13 }}>
            {COLONIAS.length} colonias · {total} vecinos con la app. El vecino elige la suya al registrarse.
          </span>
        </div>
      </div>
      <div className="list-row section-label" style={{ paddingTop: 0 }}>
        <span style={{ width: 140, flex: "0 0 140px" }}>COLONIA</span>
        <span style={{ width: 120, flex: "0 0 120px" }}>POZO</span>
        <span style={{ width: 140, flex: "0 0 140px" }}>HORARIO DE AGUA</span>
        <span style={{ width: 80, flex: "0 0 80px" }}>VECINOS</span>
        <span className="grow">ESTADO EN LA APP</span>
      </div>
      {ZONAS.map((z) => [
        <div key={z} className="section-label" style={{ padding: "16px 0 4px" }}>{z.toUpperCase()}</div>,
        ...COLONIAS.filter((c) => c.zona === z).map((c) => {
        const a = agua[c.nombre];
        return (
          <div className="list-row" key={c.nombre}>
            <strong style={{ width: 140, flex: "0 0 140px" }}>{c.nombre}</strong>
            <span className="muted" style={{ width: 120, flex: "0 0 120px" }}>{c.pozo || "—"}</span>
            <span className="muted" style={{ width: 140, flex: "0 0 140px" }}>{c.horario || "—"}</span>
            <span style={{ width: 80, flex: "0 0 80px", fontWeight: 600 }}>{c.vecinos}</span>
            <span className="grow row" style={{ gap: 8, alignItems: "center" }}>
              <span className={`pill ${a?.estado ?? "sin_dato"}`}>{ETIQUETA_ESTADO[a?.estado ?? "sin_dato"].toUpperCase()}</span>
              <span className="muted" style={{ fontSize: 12 }}>{a ? haceTexto(a.creadoEn) : "nunca publicado"}</span>
            </span>
            <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" onClick={() => router.push("/panel/agua")}>
              Actualizar
            </button>
          </div>
        );
      }),
      ])}
    </div>
  );
}
