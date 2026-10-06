"use client";

/* Gráficas de una sola serie: un solo tono de marca, marcas delgadas con
   puntas redondeadas, etiquetas directas, tooltip al pasar y tabla
   equivalente para quien no puede leer la gráfica. */

export interface Punto { etiqueta: string; valor: number; detalle?: string }

export function Kpi({ n, t, s, onClick }: { n: string | number; t: string; s?: string; onClick?: () => void }) {
  return (
    <div className="card metric col" style={{ gap: 2, cursor: onClick ? "pointer" : undefined }} onClick={onClick}>
      <span className="n">{n}</span>
      <span style={{ fontWeight: 500 }}>{t}</span>
      {s && <span className="muted" style={{ fontSize: 11 }}>{s}</span>}
    </div>
  );
}

export function Columnas({ datos, formato = String, alto = 160, titulo }: {
  datos: Punto[]; formato?: (n: number) => string; alto?: number; titulo: string;
}) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <figure className="col" style={{ gap: 8, margin: 0 }} aria-label={titulo}>
      <div className="viz-cols" style={{ height: alto }}>
        <span className="viz-max">{formato(max)}</span>
        {datos.map((d) => (
          <div key={d.etiqueta} className="viz-col" tabIndex={0}>
            <div className="viz-bar" style={{ height: `${(d.valor / max) * 100}%` }} />
            <div className="viz-tip"><b>{formato(d.valor)}</b><span>{d.detalle ?? d.etiqueta}</span></div>
          </div>
        ))}
      </div>
      <div className="viz-x">
        {datos.map((d, i) => (
          <span key={d.etiqueta}>{i % Math.ceil(datos.length / 8) === 0 ? d.etiqueta : ""}</span>
        ))}
      </div>
      <TablaDe datos={datos} formato={formato} />
    </figure>
  );
}

export function Barras({ datos, formato = String, titulo }: { datos: Punto[]; formato?: (n: number) => string; titulo: string }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <figure className="col" style={{ gap: 10, margin: 0 }} aria-label={titulo}>
      {datos.map((d) => (
        <div key={d.etiqueta} className="viz-row" tabIndex={0} title={d.detalle}>
          <span className="viz-label">{d.etiqueta}</span>
          <div className="viz-track"><div className="viz-hbar" style={{ width: `${(d.valor / max) * 100}%` }} /></div>
          <span className="viz-val">{formato(d.valor)}</span>
        </div>
      ))}
      <TablaDe datos={datos} formato={formato} />
    </figure>
  );
}

function TablaDe({ datos, formato }: { datos: Punto[]; formato: (n: number) => string }) {
  return (
    <details className="viz-tabla">
      <summary>Ver como tabla</summary>
      <table>
        <tbody>
          {datos.map((d) => <tr key={d.etiqueta}><td>{d.detalle ?? d.etiqueta}</td><td>{formato(d.valor)}</td></tr>)}
        </tbody>
      </table>
    </details>
  );
}

export function Pestanas<T extends string>({ opciones, valor, onCambio }: {
  opciones: { id: T; nombre: string; n?: number }[]; valor: T; onCambio: (v: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {opciones.map((o) => (
        <button key={o.id} role="tab" aria-selected={valor === o.id} type="button"
          className={valor === o.id ? "on" : ""} onClick={() => onCambio(o.id)}>
          {o.nombre}{o.n !== undefined && <span className="tab-n">{o.n}</span>}
        </button>
      ))}
    </div>
  );
}
