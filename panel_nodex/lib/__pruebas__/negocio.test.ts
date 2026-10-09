import { describe, expect, it } from "vitest";
import { turnos, type Agenda } from "../tramites";
import { enlaceValido, vendidos, type Pago } from "../feria";
import { abiertoAhora, type Comercio } from "../comercios";
import { alcanceDe, aSlug, textoAlcance, zonas } from "../config";

describe("turnos de citas", () => {
  const ag: Agenda = { dependencia: "DIF", dias: [1, 2, 3, 4, 5], inicio: "09:00", fin: "10:00", minutos: 20, ventanillas: 1, inhabiles: ["2026-11-02"] };
  it("parte el horario en turnos que caben completos", () => {
    const l = turnos(ag, new Date("2026-11-03T12:00"));   // martes
    expect(l.map((d) => d.getHours() * 60 + d.getMinutes())).toEqual([540, 560, 580]);
  });
  it("no da turnos en día inhábil ni en fin de semana", () => {
    expect(turnos(ag, new Date("2026-11-02T12:00"))).toEqual([]);   // inhábil
    expect(turnos(ag, new Date("2026-11-08T12:00"))).toEqual([]);   // domingo
  });
});

describe("boletos vendidos", () => {
  const p = (x: Partial<Pago>): Pago => ({ folio: "", uid: null, concepto: "boleto", descripcion: "", monto: 0, moneda: "MXN", metodo: "tarjeta", canal: "app", estado: "pagado", creadoEn: new Date(), eventoId: "e1", zona: "General", cantidad: 2, ...x });
  it("cuenta solo boletos pagados del evento y zona", () => {
    const l = [p({}), p({ cantidad: 3, zona: "VIP" }), p({ estado: "pendiente" }), p({ estado: "reembolsado" }), p({ eventoId: "e2" }), p({ concepto: "agua" })];
    expect(vendidos(l, "e1")).toBe(5);
    expect(vendidos(l, "e1", "General")).toBe(2);
  });
});

describe("enlaces de transmisión", () => {
  it("acepta YouTube y Facebook por https", () => {
    expect(enlaceValido("https://youtube.com/live/abc")).toBe(true);
    expect(enlaceValido("https://www.facebook.com/x/live")).toBe(true);
  });
  it("rechaza vacío, http y otros sitios", () => {
    expect(enlaceValido("")).toBe(false);
    expect(enlaceValido("http://youtube.com/live/abc")).toBe(false);
    expect(enlaceValido("https://ejemplo.com/video")).toBe(false);
  });
});

describe("comercio abierto", () => {
  const c = (x: Partial<Comercio>): Comercio => ({ nombre: "", categoria: "", whatsapp: "", destacado: false, aceptaUsd: false, enviaFamilia: false, direccion: "", descripcion: "", abre: "09:00", cierra: "20:00", dias: ["L", "M", "X", "J", "V"], activo: true, ...x });
  it("respeta horario y días", () => {
    expect(abiertoAhora(c({}), new Date("2026-11-03T10:00"))).toBe(true);    // martes
    expect(abiertoAhora(c({}), new Date("2026-11-03T21:00"))).toBe(false);
    expect(abiertoAhora(c({}), new Date("2026-11-08T10:00"))).toBe(false);   // domingo
  });
  it("horario que cruza la medianoche", () => {
    const tacos = c({ abre: "19:00", cierra: "01:00", dias: ["M"] });
    expect(abiertoAhora(tacos, new Date("2026-11-03T23:30"))).toBe(true);
    expect(abiertoAhora(tacos, new Date("2026-11-03T18:00"))).toBe(false);
  });
});

describe("configuración del municipio (modo demo)", () => {
  it("el alcance sale de las estadísticas, no inventado", () => {
    expect(alcanceDe("Teocaltiche Centro")).toBe(184);
    expect(alcanceDe("Colonia que no existe")).toBe(0);
    expect(alcanceDe(null)).toBeGreaterThan(184);
    expect(textoAlcance("El Tanque")).toContain("37 vecinos");
  });
  it("zonas en el orden de la lista", () => {
    expect(zonas()).toEqual(["Centro y zonas tradicionales", "Colonias y fraccionamientos"]);
  });
  it("aSlug da ids estables sin acentos", () => {
    expect(aSlug("CTM (Los Órganos)")).toBe("ctm-los-organos");
    expect(aSlug("  San Miguel Norte ")).toBe("san-miguel-norte");
  });
});
