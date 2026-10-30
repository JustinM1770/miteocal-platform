import { describe, expect, it } from "vitest";
import { detectarReportesDuplicados, type Reporte } from "../datos";

function reporte(overrides: Partial<Reporte> = {}): Reporte {
  return {
    id: "reporte-1",
    folio: "TEC-1001",
    tipo: "fuga",
    colonia: "Centro",
    direccion: "Calle 1",
    descripcion: "Fuga de agua",
    fotoUrl: null,
    lat: 21.4282,
    lng: -102.5771,
    estado: "recibido",
    respuesta: null,
    vecinoNombre: "Vecino",
    historial: [],
    creadoEn: new Date("2026-10-29T12:00:00Z"),
    ...overrides,
  };
}

describe("detección de posibles reportes duplicados", () => {
  it("encuentra mismo tipo a menos de 50 m y 7 días, sin combinarlo", () => {
    const principal = reporte();
    const cercano = reporte({
      id: "reporte-2",
      folio: "TEC-1002",
      lng: -102.577,
      creadoEn: new Date("2026-10-28T12:00:00Z"),
    });

    expect(detectarReportesDuplicados(principal, [principal, cercano])).toEqual([
      { reporte: cercano, distanciaMetros: expect.any(Number) },
    ]);
  });

  it("excluye distinto tipo, ubicación a 50 m o más y fecha fuera de 7 días", () => {
    const principal = reporte();
    const otroTipo = reporte({ id: "tipo", tipo: "bache", lng: -102.577 });
    const lejano = reporte({ id: "lejos", lng: -102.5762 });
    const antiguo = reporte({
      id: "antiguo",
      lng: -102.577,
      creadoEn: new Date("2026-10-22T11:59:59Z"),
    });

    expect(detectarReportesDuplicados(principal, [otroTipo, lejano, antiguo])).toEqual([]);
  });

  it("no busca duplicados si el reporte no tiene ubicación GPS", () => {
    const sinUbicacion = reporte({ lat: null, lng: null });
    expect(detectarReportesDuplicados(sinUbicacion, [reporte({ id: "cercano" })])).toEqual([]);
  });
});
