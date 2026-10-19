"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import CodigoQR from "@/components/CodigoQR";
import EscanerQR, { escanerDisponible, leerQRDeImagen } from "@/components/EscanerQR";
import { contenidoPase, leerPase } from "@/lib/pase";
import { coloniasDeZona, zonas } from "@/lib/config";
import { municipioId } from "@/lib/firebase";
import { ORIGENES } from "@/lib/vecinos";
import { Barras, Kpi, Pestanas } from "@/components/graficas";
import { f, pesos } from "@/lib/almacen";
import {
  listarEventos, listarBoletos, METODOS, reembolsar, validarBoleto, venderTaquilla, vendidos,
  comprarSimulado, simularPagoRecibido, buscarPorFolio,
  type Comprador, type Evento, type MetodoPago, type Pago, type ResultadoValidacion, type Zona,
} from "@/lib/feria";

type Vista = "ventas" | "simular" | "validar" | "taquilla" | "corte";

export default function Boletos() {
  const [vista, setVista] = useState<Vista>("ventas");
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  const cargar = useCallback(async () => {
    const [p, e] = await Promise.all([listarBoletos(), listarEventos()]);
    setPagos([...p]); setEventos(e);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const boletos = useMemo(() => pagos.filter((p) => p.concepto === "boleto"), [pagos]);

  return (
    <>
      <Pestanas<Vista> valor={vista} onCambio={setVista} opciones={[
        { id: "ventas", nombre: "Ventas", n: boletos.length },
        { id: "simular", nombre: "Simular compra" },
        { id: "validar", nombre: "Validar en la entrada" },
        { id: "taquilla", nombre: "Vender en taquilla" },
        { id: "corte", nombre: "Corte de caja" },
      ]} />
      {vista === "ventas" && <Ventas boletos={boletos} eventos={eventos} onCambio={cargar} />}
      {vista === "simular" && <SimularCompra eventos={eventos} pagos={pagos} onCambio={cargar} onValidar={() => setVista("validar")} />}
      {vista === "validar" && <Validar boletos={boletos} eventos={eventos} onCambio={cargar} />}
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

const Simulado = ({ p }: { p: Pago }) => (p.simulado ? <span className="tag morado" style={{ marginLeft: 4 }}>Simulación</span> : null);

function Ventas({ boletos, eventos, onCambio }: {
  boletos: Pago[]; eventos: Evento[]; onCambio: () => Promise<void>;
}) {
  const { sesion } = useAuth();
  const [evento, setEvento] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago | "">("");
  const [buscar, setBuscar] = useState("");
  const [sel, setSel] = useState<Pago | null>(null);
  const q = buscar.trim().toLowerCase();

  const visibles = boletos.filter((p) =>
    (!evento || p.eventoId === evento) && (!metodo || p.metodo === metodo) &&
    (!q || `${p.folio} ${p.compradorNombre ?? ""}`.toLowerCase().includes(q)));
  // Las compras de prueba se ven en la lista pero no cuentan como venta
  const pagados = visibles.filter((p) => p.estado === "pagado" && !p.simulado);

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
              return (
                <tr key={p.id} className={`click${sel?.id === p.id ? " sel" : ""}`} onClick={() => setSel(p)}>
                  <td><strong>{p.folio}</strong></td>
                  <td>{p.uid ? <>{p.compradorNombre ?? "Vecino"}<div className="muted" style={{ fontSize: 11 }}>{p.compradorTipo === "paisano" ? `Paisano · ${p.compradorOrigen ?? ""}` : p.compradorColonia}</div></> : <span className="muted">Taquilla</span>}</td>
                  <td>{p.descripcion}</td>
                  <td className="num">{p.cantidad}</td>
                  <td className="num">{pesos(p.monto)}</td>
                  <td className="muted">{METODOS[p.metodo]}</td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{f(p.creadoEn).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td><EstadoPill p={p} /><Simulado p={p} /></td>
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

function PaseDigital({ p, evento }: { p: Pago; evento?: Evento }) {
  const fecha = evento ? new Date(`${evento.fecha}T12:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : "";
  return (
    <div className="phone" style={{ alignItems: "stretch" }}>
      <span className="h">Tu pase digital</span>
      <div className="acard" style={{ gap: 8 }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
          <div className="col" style={{ gap: 1 }}>
            <span className="t">{evento?.titulo ?? p.descripcion.split(" · ")[0]}</span>
            <span className="s">{[fecha, evento?.hora && `${evento.hora} hrs`].filter(Boolean).join(" · ")}</span>
          </div>
          <span className="tag azul">{p.zona}</span>
        </div>
        {p.estado === "pagado" ? (
          <>
            <CodigoQR texto={contenidoPase(municipioId(), p.folio, p.id ?? "")} tamano={170} etiqueta={`QR del boleto ${p.folio}`} />
            <span style={{ color: p.usado ? "var(--sec)" : "var(--ok)", fontWeight: 600, textAlign: "center", fontSize: 13 }}>
              {p.usado ? "Este pase ya se usó" : "Boleto válido · Presenta en la entrada"}
            </span>
          </>
        ) : p.estado === "pendiente" ? (
          <div className="acard flat" style={{ background: "var(--warn-soft)", gap: 4 }}>
            <span className="t" style={{ color: "var(--warn)", fontSize: 13 }}>Pago pendiente</span>
            <span className="s">{p.metodo === "oxxo" ? "Paga en cualquier OXXO con esta referencia:" : "Transfiere por SPEI a esta CLABE:"}</span>
            <code style={{ fontSize: 15, letterSpacing: "0.06em" }}>{p.referencia}</code>
            <span className="s">El QR aparece cuando se confirme el pago.</span>
          </div>
        ) : <span className="tag gris">Reembolsado</span>}
        <span className="muted" style={{ textAlign: "center", fontSize: 11 }}>Folio {p.folio} · {p.cantidad} acceso(s){evento ? ` · ${evento.escenario}` : ""}</span>
        <div className="btn" style={{ background: "var(--ink)", color: "#fff", padding: 10 }}>Guardar en Wallet</div>
      </div>
    </div>
  );
}

function SimularCompra({ eventos, pagos, onCambio, onValidar }: { eventos: Evento[]; pagos: Pago[]; onCambio: () => Promise<void>; onValidar: () => void }) {
  const { sesion } = useAuth();
  const conBoletos = eventos.filter((e) => e.zonas.length);
  const [paso, setPaso] = useState(1);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [zona, setZona] = useState<Zona | null>(null);
  const [cantidad, setCantidad] = useState(2);
  const [comprador, setComprador] = useState<Comprador>({ nombre: "", colonia: "", tipo: "local", origen: null });
  const [metodo, setMetodo] = useState<"tarjeta" | "oxxo" | "spei">("tarjeta");
  const [pago, setPago] = useState<Pago | null>(null);
  const [procesando, setProcesando] = useState(false);

  const quedan = evento && zona ? zona.cupo - vendidos(pagos, evento.id!, zona.nombre) : 0;
  const total = zona ? zona.precio * cantidad : 0;
  const reiniciar = () => { setPaso(1); setEvento(null); setZona(null); setCantidad(2); setPago(null); };
  const PASOS = ["Evento", "Zona y boletos", "Comprador", "Pago", "Pase digital"];

  return (
    <div className="row">
      <div className="card grow col" style={{ gap: 16 }}>
        <div className="banner info" style={{ padding: "10px 14px" }}>
          <span><strong>Simulación.</strong> <span className="muted">Recorre el flujo que hará la app. No cobra nada y no cuenta como venta.</span></span>
        </div>
        <ol className="row" style={{ gap: 6, listStyle: "none", margin: 0, padding: 0, flexWrap: "wrap" }} aria-label="Pasos de la compra">
          {PASOS.map((n, i) => (
            <li key={n} className={`tag ${paso === i + 1 ? "azul" : paso > i + 1 ? "verde" : "gris"}`} aria-current={paso === i + 1 ? "step" : undefined}>{i + 1}. {n}</li>
          ))}
        </ol>

        {paso === 1 && (
          <div className="col" style={{ gap: 8 }}>
            <h3 className="h3">¿A qué evento?</h3>
            {conBoletos.length === 0 && <span className="muted">No hay eventos con boletos en el programa.</span>}
            {conBoletos.map((e) => {
              const cupo = e.zonas.reduce((s, z) => s + z.cupo, 0);
              const agotado = cupo > 0 && vendidos(pagos, e.id!) >= cupo;
              return (
                <button key={e.id} type="button" className="acard" disabled={agotado} onClick={() => { setEvento(e); setZona(e.zonas[0]); setPaso(2); }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, textAlign: "left", cursor: agotado ? "not-allowed" : "pointer", opacity: agotado ? 0.5 : 1 }}>
                  <div className="datebadge azul"><b>{e.fecha.slice(8, 10)}</b><small>{new Date(`${e.fecha}T12:00`).toLocaleDateString("es-MX", { month: "short" }).replace(".", "").toUpperCase()}</small></div>
                  <div className="col grow" style={{ gap: 2 }}><span className="t">{e.titulo}</span><span className="s">{e.escenario} · {e.hora} hrs</span></div>
                  <strong>{agotado ? "Agotado" : `desde ${pesos(Math.min(...e.zonas.map((z) => z.precio)))}`}</strong>
                </button>
              );
            })}
          </div>
        )}

        {paso === 2 && evento && zona && (
          <div className="col" style={{ gap: 14 }}>
            <h3 className="h3">{evento.titulo}</h3>
            <div className="field"><label className="section-label">ZONA</label>
              <div className="seg">{evento.zonas.map((z) => (
                <button key={z.nombre} type="button" className={zona.nombre === z.nombre ? "on azul" : ""} onClick={() => setZona(z)}>{z.nombre} · {pesos(z.precio)}</button>
              ))}</div>
              <span className="muted" style={{ fontSize: 12 }}>Quedan {Math.max(0, quedan).toLocaleString("es-MX")} lugares.</span></div>
            <div className="field"><label className="section-label">BOLETOS</label>
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <button className="btn ghost" type="button" aria-label="Menos" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
                <strong style={{ fontSize: 20, width: 40, textAlign: "center" }} aria-live="polite">{cantidad}</strong>
                <button className="btn ghost" type="button" aria-label="Más" onClick={() => setCantidad((c) => Math.min(8, c + 1))}>+</button>
                <span className="grow" /><strong style={{ fontSize: 22 }}>{pesos(total)}</strong>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>Máximo 8 por compra.</span></div>
            <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
              <button className="btn ghost" type="button" onClick={() => setPaso(1)}>Atrás</button>
              <button className="btn primary" type="button" disabled={quedan < cantidad} onClick={() => setPaso(3)}>{quedan < cantidad ? "No hay lugares suficientes" : "Continuar"}</button>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="col" style={{ gap: 12 }}>
            <h3 className="h3">¿Quién compra?</h3>
            <div className="field"><label className="section-label">NOMBRE</label>
              <input className="input" value={comprador.nombre} onChange={(e) => setComprador({ ...comprador, nombre: e.target.value })} placeholder="María López" /></div>
            <div className="field"><label className="section-label">DÓNDE VIVE</label>
              <div className="seg">
                <button type="button" className={comprador.tipo === "local" ? "on azul" : ""} onClick={() => setComprador({ ...comprador, tipo: "local", origen: null })}>En el municipio</button>
                <button type="button" className={comprador.tipo === "paisano" ? "on azul" : ""} onClick={() => setComprador({ ...comprador, tipo: "paisano", origen: ORIGENES[0] })}>✈ Paisano en EE. UU.</button>
              </div></div>
            {comprador.tipo === "paisano" && (
              <div className="field"><label className="section-label">CIUDAD</label>
                <select className="select" value={comprador.origen ?? ""} onChange={(e) => setComprador({ ...comprador, origen: e.target.value })}>{ORIGENES.map((o) => <option key={o}>{o}</option>)}</select></div>
            )}
            <div className="field"><label className="section-label">{comprador.tipo === "paisano" ? "COLONIA DE SU FAMILIA" : "COLONIA"}</label>
              <select className="select" value={comprador.colonia} onChange={(e) => setComprador({ ...comprador, colonia: e.target.value })}>
                <option value="">Elige una colonia</option>
                {zonas().map((z) => <optgroup key={z} label={z}>{coloniasDeZona(z).map((c) => <option key={c.id}>{c.nombre}</option>)}</optgroup>)}
              </select></div>
            <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
              <button className="btn ghost" type="button" onClick={() => setPaso(2)}>Atrás</button>
              <button className="btn primary" type="button" disabled={!comprador.nombre.trim() || !comprador.colonia} onClick={() => setPaso(4)}>Continuar</button>
            </div>
          </div>
        )}

        {paso === 4 && evento && zona && (
          <div className="col" style={{ gap: 12 }}>
            <h3 className="h3">Pago · {pesos(total)}</h3>
            <span className="muted" style={{ fontSize: 13 }}>{cantidad} × {zona.nombre} · {evento.titulo}</span>
            {([
              ["tarjeta", "Tarjeta de crédito o débito", "Se aprueba al momento y el pase sale de inmediato. Desde EE. UU. también."],
              ["oxxo", "Efectivo en OXXO", "Genera una referencia; el pase aparece cuando se paga (hasta 72 h)."],
              ["spei", "Transferencia SPEI", "Genera una CLABE; el pase aparece al recibir la transferencia."],
            ] as const).map(([m, t, d]) => (
              <button key={m} type="button" className={`option${metodo === m ? " on activo" : ""}`} style={{ alignItems: "flex-start" }} onClick={() => setMetodo(m)}>
                <span className="radio" style={{ marginTop: 3 }} />
                <span className="col" style={{ gap: 2 }}><strong>{t}</strong><span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>{d}</span></span>
              </button>
            ))}
            <span className="muted" style={{ fontSize: 12 }}>En la simulación no se capturan datos de tarjeta.</span>
            <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
              <button className="btn ghost" type="button" onClick={() => setPaso(3)}>Atrás</button>
              <button className="btn primary" type="button" disabled={procesando} onClick={async () => {
                setProcesando(true);
                await new Promise((r) => setTimeout(r, 900));   // lo que tardaría la pasarela
                const p = await comprarSimulado(evento, zona, cantidad, { ...comprador, nombre: comprador.nombre.trim() }, metodo, sesion!.nombre);
                setPago(p); setPaso(5); setProcesando(false); await onCambio();
              }}>{procesando ? "Procesando pago…" : metodo === "tarjeta" ? `Pagar ${pesos(total)}` : "Generar referencia"}</button>
            </div>
          </div>
        )}

        {paso === 5 && pago && (
          <div className="col" style={{ gap: 12 }}>
            <div className="banner" style={{ background: pago.estado === "pagado" ? "var(--ok-soft)" : "var(--warn-soft)", display: "block" }}>
              <strong>{pago.estado === "pagado" ? `✓ Compra aprobada · folio ${pago.folio}` : `Referencia generada · folio ${pago.folio}`}</strong>
              <div className="muted" style={{ fontSize: 13 }}>{pago.estado === "pagado" ? "El pase con QR ya está en la app del vecino." : "Cuando el vecino pague, el pase se activa solo."}</div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {pago.estado === "pendiente" && (
                <button className="btn primary" type="button" onClick={async () => {
                  await simularPagoRecibido(pago, sesion!.nombre);
                  setPago({ ...pago, estado: "pagado" }); await onCambio();
                }}>Simular que ya pagó en {pago.metodo === "oxxo" ? "OXXO" : "SPEI"}</button>
              )}
              {pago.estado === "pagado" && <button className="btn primary" type="button" onClick={onValidar}>Probar en la entrada</button>}
              <button className="btn ghost" type="button" onClick={reiniciar}>Simular otra compra</button>
            </div>
          </div>
        )}
      </div>

      <div className="col" style={{ width: 300, flex: "0 0 300px", gap: 10 }}>
        <span className="section-label">LO QUE VE EL VECINO</span>
        {pago ? <PaseDigital p={pago} evento={evento ?? undefined} /> : (
          <div className="phone">
            <span className="h">{evento?.titulo ?? "Cartelera"}</span>
            <span className="s" style={{ fontSize: 12, color: "var(--sec)" }}>{evento ? `${evento.escenario} · ${evento.hora} hrs` : "Elige un evento"}</span>
            {zona && <div className="acard flat"><span className="s">{cantidad} × {zona.nombre}</span><span className="t">{pesos(total)}</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}

function Validar({ boletos, eventos, onCambio }: { boletos: Pago[]; eventos: Evento[]; onCambio: () => Promise<void> }) {
  const { sesion } = useAuth();
  const [folio, setFolio] = useState("");
  const [escaneando, setEscaneando] = useState(false);
  const [ultimo, setUltimo] = useState<{ ok: boolean; titulo: string; detalle: string } | null>(null);
  const [mostrado, setMostrado] = useState<Pago | null>(null);
  const encontrado = boletos.find((p) => p.folio.toLowerCase() === folio.trim().toLowerCase()) ?? mostrado;

  /** Valida lo que venga: contenido del QR o folio escrito */
  const validarTexto = useCallback(async (texto: string) => {
    setEscaneando(false);
    const leido = leerPase(texto);
    if (!leido) { setUltimo({ ok: false, titulo: "QR no reconocido", detalle: "No es un pase de la app. Pide al vecino que abra «Tu pase digital»." }); return; }
    if ("municipio" in leido && leido.municipio !== municipioId()) { setUltimo({ ok: false, titulo: "Pase de otro municipio", detalle: `Este pase es de ${leido.municipio}.` }); return; }
    const p = boletos.find((x) => x.folio === leido.folio) ?? await buscarPorFolio(leido.folio);
    if (!p) { setUltimo({ ok: false, titulo: "Folio no encontrado", detalle: "Revisa que el vecino muestre su pase digital de la app." }); return; }
    setMostrado(p);
    const r = await validarBoleto(p, sesion!.nombre);
    const MENSAJE: Record<Exclude<ResultadoValidacion, "valido">, { titulo: string; detalle: string }> = {
      "no-existe": { titulo: "Folio no encontrado", detalle: "Revisa que el vecino muestre su pase digital de la app." },
      reembolsado: { titulo: "Boleto reembolsado", detalle: p.descripcion },
      pendiente: { titulo: "Pago pendiente", detalle: p.metodo === "spei" ? "La transferencia no ha llegado." : "La ficha de OXXO no se ha pagado." },
      "ya-entro": { titulo: "Este boleto ya entró", detalle: p.usadoEn ? `Validado el ${f(p.usadoEn).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Se validó en otra puerta." },
    };
    if (r !== "valido") { setUltimo({ ok: false, ...MENSAJE[r] }); await onCambio(); return; }
    setUltimo({ ok: true, titulo: `Pase · ${p.cantidad} persona(s)`, detalle: `${p.descripcion} · ${p.compradorNombre ?? "Taquilla"}${p.simulado ? " · simulación" : ""}` });
    setFolio("");
    await onCambio();
  }, [boletos, onCambio, sesion]);

  return (
    <div className="row">
      <div className="card grow col" style={{ gap: 14 }}>
        <h3 className="h3">Validar boleto</h3>
        <span className="muted" style={{ fontSize: 13 }}>Escanea el QR del pase digital o escribe el folio. Cada boleto entra una sola vez, aunque lo escaneen en dos puertas.</span>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <button className="btn primary" type="button" onClick={() => setEscaneando(true)} disabled={!escanerDisponible()}
            title={escanerDisponible() ? undefined : "Este navegador no lee QR; usa Chrome o escribe el folio"}>📷 Escanear QR</button>
          <label className="btn ghost" style={{ cursor: escanerDisponible() ? "pointer" : "not-allowed", opacity: escanerDisponible() ? 1 : 0.5 }}>
            Subir foto del QR
            <input type="file" accept="image/*" hidden disabled={!escanerDisponible()} onChange={async (e) => {
              const a = e.target.files?.[0]; e.target.value = "";
              if (!a) return;
              try {
                const t = await leerQRDeImagen(a);
                if (t) await validarTexto(t);
                else setUltimo({ ok: false, titulo: "No se encontró un QR en la imagen", detalle: "Prueba con una foto más cercana y sin reflejos." });
              } catch (err) { setUltimo({ ok: false, titulo: "No se pudo leer la imagen", detalle: (err as Error).message }); }
            }} />
          </label>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <input className="input grow" style={{ fontSize: 18, letterSpacing: "0.04em" }} placeholder="TEC-8492" aria-label="Folio del boleto" value={folio}
            onChange={(e) => setFolio(e.target.value)} onKeyDown={(e) => e.key === "Enter" && folio.trim() && validarTexto(folio)} />
          <button className="btn ghost" type="button" disabled={!folio.trim()} onClick={() => validarTexto(folio)}>Validar folio</button>
        </div>
        {ultimo && (
          <div className="banner" role="status" style={{ background: ultimo.ok ? "var(--ok-soft)" : "var(--danger-soft)", display: "block", padding: "20px 22px" }}>
            <strong style={{ fontSize: 20, color: ultimo.ok ? "var(--ok)" : "var(--danger)" }}>{ultimo.ok ? "✓ " : "✕ "}{ultimo.titulo}</strong>
            <div className="muted">{ultimo.detalle}</div>
          </div>
        )}
        <span className="muted" style={{ fontSize: 12 }}>Folios de prueba: {boletos.filter((p) => p.estado === "pagado" && !p.usado).slice(0, 3).map((p) => p.folio).join(", ")}</span>
      </div>
      <div className="col" style={{ width: 300, flex: "0 0 300px", gap: 10 }}>
        <span className="section-label">LO QUE MUESTRA EL VECINO</span>
        {encontrado ? <PaseDigital p={encontrado} evento={eventos.find((e) => e.id === encontrado.eventoId)} /> : (
          <div className="phone"><span className="s" style={{ color: "var(--sec)", fontSize: 13 }}>Escribe un folio o escanea un pase para ver aquí lo que tiene el vecino en su teléfono.</span></div>
        )}
      </div>
      {escaneando && <EscanerQR onLeido={validarTexto} onCerrar={() => setEscaneando(false)} />}
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
  const delDia = boletos.filter((p) => p.estado === "pagado" && !p.simulado && clave(f(p.creadoEn)) === dia);
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
