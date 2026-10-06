"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Barras, Kpi, Pestanas } from "@/components/graficas";
import { f, pesos } from "@/lib/almacen";
import { listarVecinos, type Vecino } from "@/lib/vecinos";
import {
  listarEventos, listarPagos, METODOS, reembolsar, validarBoleto, venderTaquilla, vendidos,
  type Evento, type MetodoPago, type Pago,
} from "@/lib/feria";

type Vista = "ventas" | "validar" | "taquilla" | "corte";

export default function Boletos() {
  const [vista, setVista] = useState<Vista>("ventas");
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [vecinos, setVecinos] = useState<Vecino[]>([]);

  const cargar = useCallback(async () => {
    const [p, e, v] = await Promise.all([listarPagos(), listarEventos(), listarVecinos()]);
    setPagos([...p]); setEventos(e); setVecinos(v);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const boletos = useMemo(() => pagos.filter((p) => p.concepto === "boleto"), [pagos]);
  const vecinoDe = useMemo(() => new Map(vecinos.map((v) => [v.id, v])), [vecinos]);

  return (
    <>
      <Pestanas<Vista> valor={vista} onCambio={setVista} opciones={[
        { id: "ventas", nombre: "Ventas", n: boletos.length },
        { id: "validar", nombre: "Validar en la entrada" },
        { id: "taquilla", nombre: "Vender en taquilla" },
        { id: "corte", nombre: "Corte de caja" },
      ]} />
      {vista === "ventas" && <Ventas boletos={boletos} eventos={eventos} vecinoDe={vecinoDe} onCambio={cargar} />}
      {vista === "validar" && <Validar boletos={boletos} vecinoDe={vecinoDe} onCambio={cargar} />}
      {vista === "taquilla" && <Taquilla eventos={eventos} pagos={pagos} onCambio={cargar} />}
      {vista === "corte" && <Corte boletos={boletos} />}
    </>
  );
}

function EstadoPill({ p }: { p: Pago }) {
  if (p.estado === "reembolsado") return <span className="tag gris">Reembolsado</span>;
  if (p.estado === "pendiente") return <span className="tag naranja">Pago pendiente</span>;
  if (p.usado) return <span className="tag azul">Ya entró</span>;
  return <span className="tag verde">Pagado</span>;
}

function Ventas({ boletos, eventos, vecinoDe, onCambio }: {
  boletos: Pago[]; eventos: Evento[]; vecinoDe: Map<string | undefined, Vecino>; onCambio: () => Promise<void>;
}) {
  const { sesion } = useAuth();
  const [evento, setEvento] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago | "">("");
  const [buscar, setBuscar] = useState("");
  const [sel, setSel] = useState<Pago | null>(null);
  const q = buscar.trim().toLowerCase();

  const visibles = boletos.filter((p) =>
    (!evento || p.eventoId === evento) && (!metodo || p.metodo === metodo) &&
    (!q || `${p.folio} ${vecinoDe.get(p.vecinoId ?? undefined)?.nombre ?? ""}`.toLowerCase().includes(q)));
  const pagados = visibles.filter((p) => p.estado === "pagado");

  return (
    <>
      <div className="row">
        <Kpi n={pesos(pagados.reduce((s, p) => s + p.monto, 0))} t="Vendido" s="con los filtros actuales" />
        <Kpi n={pagados.reduce((s, p) => s + (p.cantidad ?? 0), 0)} t="Boletos" s={`${pagados.length} compras`} />
        <Kpi n={visibles.filter((p) => p.estado === "pendiente").length} t="Pendientes de pago" s="Fichas de OXXO sin pagar" />
        <Kpi n={pagados.filter((p) => p.usado).length} t="Ya entraron" s="Validados en la puerta" />
      </div>
      <div className="card col" style={{ gap: 0, paddingBottom: 8 }}>
        <div className="row" style={{ gap: 10, paddingBottom: 12 }}>
          <input className="input grow" placeholder="Buscar por folio o nombre" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          <select className="select" style={{ width: 260 }} value={evento} onChange={(e) => setEvento(e.target.value)}>
            <option value="">Todos los eventos</option>
            {eventos.filter((e) => e.zonas.length).map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}
          </select>
          <select className="select" style={{ width: 200 }} value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago | "")}>
            <option value="">Todos los métodos</option>
            {(Object.keys(METODOS) as MetodoPago[]).map((m) => <option key={m} value={m}>{METODOS[m]}</option>)}
          </select>
        </div>
        <table className="tabla">
          <thead><tr><th>FOLIO</th><th>COMPRADOR</th><th>EVENTO · ZONA</th><th className="num">CANT.</th><th className="num">MONTO</th><th>MÉTODO</th><th>CUÁNDO</th><th>ESTADO</th></tr></thead>
          <tbody>
            {visibles.slice(0, 60).map((p) => {
              const v = vecinoDe.get(p.vecinoId ?? undefined);
              return (
                <tr key={p.id} className={`click${sel?.id === p.id ? " sel" : ""}`} onClick={() => setSel(p)}>
                  <td><strong>{p.folio}</strong></td>
                  <td>{v ? <>{v.nombre}<div className="muted" style={{ fontSize: 11 }}>{v.tipo === "paisano" ? `Paisano · ${v.origen}` : v.colonia}</div></> : <span className="muted">Taquilla</span>}</td>
                  <td>{p.descripcion}</td>
                  <td className="num">{p.cantidad}</td>
                  <td className="num">{pesos(p.monto)}</td>
                  <td className="muted">{METODOS[p.metodo]}</td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{f(p.creadoEn).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td><EstadoPill p={p} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibles.length > 60 && <span className="muted" style={{ fontSize: 12, paddingTop: 8 }}>Mostrando 60 de {visibles.length}. Usa los filtros para acotar.</span>}
      </div>

      {sel && (
        <div className="drawer">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span className="section-label">FOLIO {sel.folio}</span>
            <button className="btn ghost" style={{ padding: "6px 10px" }} type="button" onClick={() => setSel(null)}>Cerrar</button>
          </div>
          <strong style={{ fontSize: 18 }}>{sel.descripcion}</strong>
          <EstadoPill p={sel} />
          <div className="col" style={{ gap: 6, fontSize: 13 }}>
            <span>{sel.cantidad} boleto(s) · {pesos(sel.monto)}</span>
            <span className="muted">{METODOS[sel.metodo]} · {sel.canal === "app" ? "comprado en la app" : "vendido en taquilla"}</span>
            <span className="muted">{f(sel.creadoEn).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" })}</span>
            {sel.usadoEn && <span className="muted">Entró el {f(sel.usadoEn).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</span>}
          </div>
          {sel.estado === "pagado" && !sel.usado && (
            <button className="btn ghost" type="button" style={{ color: "var(--danger)" }} onClick={async () => {
              await reembolsar(sel, sesion!.nombre); setSel({ ...sel, estado: "reembolsado" }); await onCambio();
            }}>Reembolsar (simulado)</button>
          )}
        </div>
      )}
    </>
  );
}

function Validar({ boletos, vecinoDe, onCambio }: { boletos: Pago[]; vecinoDe: Map<string | undefined, Vecino>; onCambio: () => Promise<void> }) {
  const { sesion } = useAuth();
  const [folio, setFolio] = useState("");
  const [ultimo, setUltimo] = useState<{ ok: boolean; titulo: string; detalle: string } | null>(null);
  const encontrado = boletos.find((p) => p.folio.toLowerCase() === folio.trim().toLowerCase());

  async function validar() {
    const p = encontrado;
    if (!p) { setUltimo({ ok: false, titulo: "Folio no encontrado", detalle: "Revisa que el vecino muestre su pase digital de MiTeocal." }); return; }
    if (p.estado === "reembolsado") { setUltimo({ ok: false, titulo: "Boleto reembolsado", detalle: p.descripcion }); return; }
    if (p.estado === "pendiente") { setUltimo({ ok: false, titulo: "Pago pendiente", detalle: "La ficha de OXXO no se ha pagado." }); return; }
    if (p.usado) { setUltimo({ ok: false, titulo: "Este boleto ya entró", detalle: `Validado el ${f(p.usadoEn).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` }); return; }
    await validarBoleto(p, sesion!.nombre);
    setUltimo({ ok: true, titulo: `Pase · ${p.cantidad} persona(s)`, detalle: `${p.descripcion} · ${vecinoDe.get(p.vecinoId ?? undefined)?.nombre ?? "Taquilla"}` });
    setFolio("");
    await onCambio();
  }

  return (
    <div className="row">
      <div className="card grow col" style={{ gap: 14 }}>
        <h3 className="h3">Validar boleto</h3>
        <span className="muted" style={{ fontSize: 13 }}>Escanea el QR del pase digital o escribe el folio. Cada boleto entra una sola vez.</span>
        <div className="row" style={{ gap: 10 }}>
          <input className="input grow" style={{ fontSize: 18, letterSpacing: "0.04em" }} placeholder="TEC-8492" value={folio}
            onChange={(e) => setFolio(e.target.value)} onKeyDown={(e) => e.key === "Enter" && validar()} autoFocus />
          <button className="btn primary" type="button" disabled={!folio.trim()} onClick={validar}>Validar</button>
        </div>
        {ultimo && (
          <div className="banner" style={{ background: ultimo.ok ? "var(--ok-soft)" : "var(--danger-soft)", display: "block", padding: "20px 22px" }}>
            <strong style={{ fontSize: 20, color: ultimo.ok ? "var(--ok)" : "var(--danger)" }}>{ultimo.ok ? "✓ " : "✕ "}{ultimo.titulo}</strong>
            <div className="muted">{ultimo.detalle}</div>
          </div>
        )}
        <span className="muted" style={{ fontSize: 12 }}>Folios de prueba: {boletos.filter((p) => p.estado === "pagado" && !p.usado).slice(0, 3).map((p) => p.folio).join(", ")}</span>
      </div>
      <div className="col" style={{ width: 300, flex: "0 0 300px", gap: 10 }}>
        <span className="section-label">LO QUE MUESTRA EL VECINO</span>
        <div className="phone" style={{ alignItems: "stretch" }}>
          <div className="row" style={{ justifyContent: "space-between" }}><strong>{encontrado?.descripcion.split(" · ")[0] ?? "Banda El Recodo"}</strong><span className="tag azul">{encontrado?.zona ?? "General"}</span></div>
          <div style={{ height: 150, borderRadius: 12, background: "repeating-conic-gradient(var(--ink) 0 25%, #fff 0 50%) 0 0 / 18px 18px", margin: "6px 20px" }} aria-hidden />
          <span style={{ color: "var(--ok)", fontWeight: 600, textAlign: "center", fontSize: 13 }}>Boleto válido · Presenta en la entrada</span>
          <span className="muted" style={{ textAlign: "center", fontSize: 11 }}>Folio {encontrado?.folio ?? "TEC-8492"} · {encontrado?.cantidad ?? 1} acceso(s)</span>
        </div>
      </div>
    </div>
  );
}

function Taquilla({ eventos, pagos, onCambio }: { eventos: Evento[]; pagos: Pago[]; onCambio: () => Promise<void> }) {
  const { sesion } = useAuth();
  const conBoletos = eventos.filter((e) => e.zonas.length);
  const [eventoId, setEventoId] = useState(conBoletos[0]?.id ?? "");
  const [zona, setZona] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [folio, setFolio] = useState<string | null>(null);
  const ev = conBoletos.find((e) => e.id === eventoId) ?? conBoletos[0];
  const z = ev?.zonas.find((x) => x.nombre === zona) ?? ev?.zonas[0];
  if (!ev || !z) return <div className="card muted">No hay eventos con boletos.</div>;
  const quedan = z.cupo - vendidos(pagos, ev.id!, z.nombre);

  return (
    <div className="card col" style={{ gap: 16, maxWidth: 640 }}>
      <h3 className="h3">Venta en taquilla</h3>
      <span className="muted" style={{ fontSize: 13 }}>Para quien no tiene la app. Cuenta contra el mismo cupo que la venta en línea, así no se sobrevende.</span>
      <div className="field"><label className="section-label">EVENTO</label>
        <select className="select" value={ev.id} onChange={(e) => { setEventoId(e.target.value); setZona(""); setFolio(null); }}>
          {conBoletos.map((e) => <option key={e.id} value={e.id}>{e.titulo} · {e.fecha} {e.hora}</option>)}
        </select></div>
      <div className="field"><label className="section-label">ZONA</label>
        <div className="seg">
          {ev.zonas.map((x) => (
            <button key={x.nombre} type="button" className={z.nombre === x.nombre ? "on azul" : ""} onClick={() => { setZona(x.nombre); setFolio(null); }}>
              {x.nombre} · {pesos(x.precio)}
            </button>
          ))}
        </div>
        <span className="muted" style={{ fontSize: 12 }}>Quedan {Math.max(0, quedan).toLocaleString("es-MX")} lugares en {z.nombre}.</span>
      </div>
      <div className="field"><label className="section-label">CANTIDAD</label>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <button className="btn ghost" type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
          <strong style={{ fontSize: 20, width: 40, textAlign: "center" }}>{cantidad}</strong>
          <button className="btn ghost" type="button" onClick={() => setCantidad((c) => Math.min(10, c + 1))}>+</button>
          <span className="grow" />
          <strong style={{ fontSize: 22 }}>{pesos(z.precio * cantidad)}</strong>
        </div></div>
      <button className="btn primary" type="button" disabled={quedan < cantidad}
        onClick={async () => { setFolio(await venderTaquilla(ev, z, cantidad, sesion!.nombre)); await onCambio(); }}>
        {quedan < cantidad ? "Sin lugares suficientes" : "Cobrar en efectivo"}
      </button>
      {folio && <div className="banner" style={{ background: "var(--ok-soft)" }}><strong>Vendido · folio {folio}</strong><span className="muted">Imprime o anota el folio para el comprador.</span></div>}
    </div>
  );
}

function Corte({ boletos }: { boletos: Pago[] }) {
  // en-CA da AAAA-MM-DD en hora local, igual que el input de fecha
  const clave = (d: Date) => d.toLocaleDateString("en-CA");
  const [dia, setDia] = useState(() => clave(new Date()));
  const delDia = boletos.filter((p) => p.estado === "pagado" && clave(f(p.creadoEn)) === dia);
  const porMetodo = (Object.keys(METODOS) as MetodoPago[]).map((m) => {
    const l = delDia.filter((p) => p.metodo === m);
    return { etiqueta: METODOS[m], valor: l.reduce((s, p) => s + p.monto, 0), detalle: `${l.length} operaciones` };
  });
  const total = delDia.reduce((s, p) => s + p.monto, 0);
  const efectivo = delDia.filter((p) => p.metodo === "taquilla").reduce((s, p) => s + p.monto, 0);

  return (
    <div className="row">
      <div className="card grow col" style={{ gap: 16 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="h3">Corte de caja</h3>
          <input className="input" type="date" style={{ width: 180 }} value={dia} onChange={(e) => setDia(e.target.value)} />
        </div>
        <Barras datos={porMetodo} formato={(n) => pesos(n)} titulo="Corte por método de pago" />
      </div>
      <div className="card col" style={{ gap: 10, width: 340, flex: "0 0 340px" }}>
        <span className="section-label">TOTAL DEL DÍA</span>
        <span className="big">{pesos(total)}</span>
        <span className="muted">{delDia.length} operaciones · {delDia.reduce((s, p) => s + (p.cantidad ?? 0), 0)} boletos</span>
        <div className="banner warn" style={{ display: "block" }}>
          <strong style={{ fontSize: 13 }}>Efectivo a entregar: {pesos(efectivo)}</strong>
          <div className="muted" style={{ fontSize: 12 }}>Lo cobrado en taquilla. Lo de tarjeta, OXXO y SPEI llega por la pasarela.</div>
        </div>
      </div>
    </div>
  );
}
