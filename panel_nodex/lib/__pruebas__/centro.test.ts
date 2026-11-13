import { describe, expect, it } from "vitest";
import { aplicaFiltro, informe, interpretarOrden, narrar, urgenciaDe } from "../centro";
import type { Reporte } from "../datos";

const COLONIAS = ["Teocaltiche Centro", "San Miguel Norte", "San Miguel Sur", "El Tanque"];

const rep = (p: Partial<Reporte>): Reporte => ({
  folio: "TEC-1", tipo: "fuga", colonia: "Teocaltiche Centro", direccion: "", descripcion: "", fotoUrl: null,
  lat: 21.4271, lng: -102.5764, estado: "recibido", respuesta: null, vecinoNombre: "", historial: [],
  creadoEn: new Date("2026-11-01T10:00:00"), ...p,
});

describe("interpretarOrden", () => {
  it("filtra por tipo y urgencia", () => {
    const o = interpretarOrden("Muéstrame las fugas urgentes", COLONIAS);
    expect(o).toMatchObject({ accion: "filtrar", tipo: "fuga", urgencia: "alta" });
  });

  it("vuela a una colonia aunque venga sin acentos", () => {
    expect(interpretarOrden("vuela a san miguel norte", COLONIAS)).toMatchObject({ accion: "volar", colonia: "San Miguel Norte" });
  });

  it("prefiere la colonia de nombre más largo", () => {
    expect(interpretarOrden("baches en San Miguel Sur", COLONIAS)).toMatchObject({ tipo: "bache", colonia: "San Miguel Sur" });
  });

  it("prende y apaga capas", () => {
    expect(interpretarOrden("muestra las zonas críticas", COLONIAS)).toMatchObject({ accion: "capa", capa: "calor", encender: true });
    expect(interpretarOrden("oculta los cierres", COLONIAS)).toMatchObject({ accion: "capa", capa: "cierres", encender: false });
    expect(interpretarOrden("dónde va el camión", COLONIAS)).toMatchObject({ accion: "capa", capa: "basura" });
  });

  it("pide el informe y avisa cuando no entiende", () => {
    expect(interpretarOrden("dame el resumen", COLONIAS).accion).toBe("informe");
    expect(interpretarOrden("hola", COLONIAS).respuesta).toMatch(/No entendí/);
  });
});

describe("urgencia y filtros", () => {
  it("usa la urgencia confirmada antes que la sugerida y la del tipo", () => {
    expect(urgenciaDe(rep({ tipo: "luminaria" }))).toBe("baja");
    const sugerida = { tipo: "luminaria" as const, urgencia: "alta" as const, area: "Servicios Públicos" as const, confianza: 80, modelo: "x", clasificadaEn: new Date() };
    expect(urgenciaDe(rep({ tipo: "luminaria", clasificacionIASugerida: sugerida }))).toBe("alta");
  });

  it("filtra pendientes por colonia sin importar acentos", () => {
    const o = { estado: "abiertos" as const, colonia: "teocaltiche centro" };
    expect(aplicaFiltro(rep({}), o)).toBe(true);
    expect(aplicaFiltro(rep({ estado: "resuelto" }), o)).toBe(false);
  });
});

describe("informe", () => {
  it("cuenta pendientes, urgentes y la colonia crítica sin inventar datos", () => {
    const ahora = new Date("2026-11-01T18:00:00");
    const reportes = [
      rep({ colonia: "San Miguel Norte" }),
      rep({ colonia: "San Miguel Norte", tipo: "bache" }),
      rep({ colonia: "El Tanque", tipo: "luminaria" }),
      rep({ estado: "resuelto", historial: [{ estado: "resuelto", mensaje: "", autor: "", fecha: new Date("2026-11-01T12:00:00") }] }),
    ];
    const i = informe(reportes, ahora);
    expect(i).toMatchObject({ abiertos: 3, urgentes: 1, resueltosSemana: 1, nuevosHoy: 4, respuestaHoras: 2 });
    expect(i.coloniaCritica?.nombre).toBe("San Miguel Norte");
    expect(narrar(i, "Teocaltiche")).toContain("Hay 3 reportes pendientes, 1 de urgencia alta.");
  });
});
