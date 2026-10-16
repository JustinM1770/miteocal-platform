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

import { contenidoPase, leerPase } from "../pase";

describe("pase digital (QR)", () => {
  it("el contenido del QR ida y vuelta", () => {
    expect(leerPase(contenidoPase("teocaltiche", "TEC-20001", "abc123"))).toEqual({ municipio: "teocaltiche", folio: "TEC-20001", pagoId: "abc123" });
  });
  it("acepta el folio escrito a mano, en minúsculas", () => {
    expect(leerPase(" tec-8492 ")).toEqual({ folio: "TEC-8492" });
  });
  it("rechaza QR ajenos o incompletos", () => {
    expect(leerPase("https://ejemplo.com")).toBeNull();
    expect(leerPase("MITEOCAL1|teocaltiche")).toBeNull();
  });
});

describe("compras simuladas", () => {
  it("no ocupan lugares del cupo", () => {
    const base = { folio: "", uid: null, concepto: "boleto" as const, descripcion: "", monto: 0, moneda: "MXN" as const, metodo: "tarjeta" as const, estado: "pagado" as const, creadoEn: new Date(), eventoId: "e1", zona: "General", cantidad: 2 };
    expect(vendidos([{ ...base, canal: "app" }, { ...base, canal: "simulacion", simulado: true }], "e1")).toBe(2);
  });
});

import { leerCSV, validar, ESQUEMAS } from "../importar";
import { enlacePedido, ventaAlcoholPermitida } from "../comercios";

describe("importador CSV", () => {
  it("respeta comillas, comas dentro de comillas, punto y coma y CRLF", () => {
    expect(leerCSV('nombre,nota\r\n"Cruz Roja, Teocaltiche","dice ""hola"""\r\n')).toEqual([["nombre", "nota"], ["Cruz Roja, Teocaltiche", 'dice "hola"']]);
    expect(leerCSV("a;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("valida renglón por renglón y detecta repetidos", () => {
    const e = ESQUEMAS.find((x) => x.id === "escuelas")!;
    const r = validar(e, leerCSV("nombre,nivel,alumnos\nPrimaria A,primaria,300\nKinder B,Guardería,10\nPrimaria A,Primaria,1\n"));
    expect(r.validadas[0].errores).toEqual([]);
    expect(r.validadas[0].datos.nivel).toBe("Primaria");
    expect(r.validadas[1].errores[0]).toContain("no es válido");
    expect(r.validadas[2].errores[0]).toContain("repetido");
  });
  it("avisa si falta una columna obligatoria", () => {
    expect(validar(ESQUEMAS[1], leerCSV("nombre\nCruz Roja")).errorGeneral).toContain("telefono");
  });
});

describe("alcohol y pedidos", () => {
  const base = { nombre: "Tienda", categoria: "Tiendas", whatsapp: "", destacado: false, aceptaUsd: false, enviaFamilia: false, direccion: "", descripcion: "", abre: "08:00", cierra: "22:00", dias: [], activo: true };
  it("venta de alcohol: licencia vigente, en horario y sin ley seca", () => {
    const c = { ...base, licencia: { numero: "LF-1", vence: "2099-01-01", alcohol: true, horarioAlcohol: { desde: "10:00", hasta: "22:00" } } };
    expect(ventaAlcoholPermitida(c, false, new Date("2026-11-03T12:00"))).toBe(true);
    expect(ventaAlcoholPermitida(c, false, new Date("2026-11-03T23:00"))).toBe(false);
    expect(ventaAlcoholPermitida(c, true, new Date("2026-11-03T12:00"))).toBe(false);
    expect(ventaAlcoholPermitida({ ...c, licencia: { ...c.licencia, vence: "2020-01-01" } }, false, new Date("2026-11-03T12:00"))).toBe(false);
  });
  it("el enlace de pedido lleva ref=miteocal", () => {
    expect(enlacePedido({ ...base, qboard: { tienda: "https://qboard.mx/tienda", desde: "" } }, "teocaltiche")).toBe("https://qboard.mx/tienda?ref=miteocal&utm_source=miteocal&utm_campaign=teocaltiche");
    expect(enlacePedido(base, "teocaltiche")).toBeNull();
  });
});
