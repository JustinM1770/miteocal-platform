import { describe, expect, it } from "vitest";
import { duracion, enPeriodo, impacto, reportesDeCSV, ultimaFecha, inicioSemana, porColonia, puntosDeCalor, tendenciaSemanal, variacion, type ReporteZona } from "../zonas";

const HOY = new Date("2026-10-21T12:00");   // miércoles
const dias = (n: number) => new Date(+HOY - n * 86_400_000);
const r = (x: Partial<ReporteZona>): ReporteZona => ({ tipo: "bache", colonia: "Centro", lat: null, lng: null, estado: "recibido", historial: [], creadoEn: dias(1), ...x });

describe("semanas", () => {
  it("empiezan en lunes", () => {
    expect(inicioSemana(HOY)).toEqual(new Date("2026-10-19T00:00"));
    expect(inicioSemana(new Date("2026-10-25T23:00"))).toEqual(new Date("2026-10-19T00:00"));   // domingo
  });
  it("cuenta por semana y deja en 0 las vacías", () => {
    const l = [r({}), r({ creadoEn: dias(2), estado: "resuelto" }), r({ creadoEn: dias(15) }), r({ creadoEn: dias(60) })];
    const t = tendenciaSemanal(l, 4, HOY);
    expect(t.map((s) => s.total)).toEqual([0, 1, 0, 2]);
    expect(t[3].resueltos).toBe(1);
    expect(enPeriodo(l, 4, HOY)).toHaveLength(3);
  });
  it("variación sin base es null", () => {
    expect(variacion(6, 4)).toBe(50);
    expect(variacion(3, 0)).toBeNull();
  });
});

describe("zonas críticas", () => {
  const l = [
    ...Array.from({ length: 10 }, () => r({ colonia: "Centro" })),
    r({ colonia: "Norte" }), r({ colonia: "Norte", tipo: "fuga" }), r({ colonia: "Norte", tipo: "fuga", estado: "resuelto" }),
    r({ colonia: "Sur" }), r({ colonia: "Este" }),
  ];
  it("marca la colonia que se sale del promedio", () => {
    const c = porColonia(l, [], HOY);
    expect(c[0]).toMatchObject({ colonia: "Centro", total: 10, critica: true });
    expect(c.filter((x) => x.critica)).toHaveLength(1);
    expect(c.find((x) => x.colonia === "Norte")).toMatchObject({ tipoPrincipal: "fuga", pendientes: 2, resueltos: 1 });
  });
  it("sin GPS usa el centro de la colonia; sin nada, no la pinta", () => {
    const c = porColonia([r({ colonia: "Centro" }), r({ colonia: "Sur", lat: 21, lng: -102 }), r({ colonia: "Oeste" })], [{ nombre: "Centro", lat: 20, lng: -103 }], HOY);
    const p = puntosDeCalor([r({ colonia: "Centro" }), r({ colonia: "Oeste", estado: "resuelto" })], c);
    expect(p).toEqual([{ punto: { lng: -103, lat: 20 }, peso: 2 }]);
  });
});

describe("impacto", () => {
  const h = (horas: number, estado: ReporteZona["estado"]) => ({ estado, fecha: new Date(+dias(10) + horas * 3_600_000) });
  it("promedia la primera respuesta y la solución", () => {
    const l = [
      r({ creadoEn: dias(10), estado: "resuelto", historial: [h(2, "en_proceso"), h(20, "resuelto")] }),
      r({ creadoEn: dias(10), estado: "en_proceso", historial: [h(6, "en_proceso")] }),
      r({ creadoEn: dias(5) }),
      r({ creadoEn: new Date(+HOY - 3_600_000) }),
    ];
    const m = impacto(l, HOY);
    expect(m).toMatchObject({ total: 4, atendidos: 1, tasaAtencion: 25, respuestaPromedio: 4, respuestaMediana: 4, resolucionPromedio: 20, sinRespuesta48: 1 });
  });
  it("se lee en horas o días", () => {
    expect(duracion(null)).toBe("—");
    expect(duracion(0.5)).toBe("30 min");
    expect(duracion(5.4)).toBe("5 h");
    expect(duracion(72)).toBe("3 días");
  });
});

describe("CSV externo", () => {
  it("reconoce encabezados por sinónimos y traduce tipo, estado y fechas", () => {
    const l = reportesDeCSV([
      ["Folio", "Fecha_Reporte", "Colonia", "Categoría", "Estatus", "Fecha de cierre", "Latitud", "Longitud"],
      ["1", "03/11/2026 09:30", "Centro", "Alumbrado público", "Atendido", "04/11/2026 10:30", "21.42", "-102.57"],
      ["2", "2026-11-02", "Norte", "Fuga en toma", "En proceso", "", "", ""],
      ["3", "sin fecha", "Sur", "Bache", "", "", "", ""],
    ]);
    expect(l.error).toBeNull();
    expect(l.columnas).toMatchObject({ fecha: "Fecha_Reporte", tipo: "Categoría", estado: "Estatus", cierre: "Fecha de cierre" });
    expect(l.ignoradas).toEqual(["Folio"]);
    expect(l.descartados).toEqual([4]);
    expect(l.reportes[0]).toMatchObject({ tipo: "luminaria", estado: "resuelto", colonia: "Centro", lat: 21.42 });
    expect(impacto(l.reportes).resolucionPromedio).toBe(25);
    expect(l.reportes[1]).toMatchObject({ tipo: "fuga", estado: "en_proceso", lat: null });
    expect(ultimaFecha(l.reportes)).toEqual(new Date(2026, 10, 3, 9, 30));
  });
  it("explica qué falta en vez de inventar", () => {
    expect(reportesDeCSV([["colonia"], ["Centro"]]).error).toMatch(/fecha/);
    expect(reportesDeCSV([["fecha", "tipo"], ["2026-11-03", "bache"]]).error).toMatch(/colonia/);
  });
});
