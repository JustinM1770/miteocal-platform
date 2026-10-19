import { describe, expect, it } from "vitest";
import { aJSON, avances, deJSON, distancia, horaEn, masCercano } from "../mapas";

describe("horaEn: a qué hora pasa el camión", () => {
  it("reparte el horario a lo largo del recorrido", () => {
    expect(horaEn("07:00", "09:00", 0)).toBe("07:00");
    expect(horaEn("07:00", "09:00", 0.5)).toBe("08:00");
    expect(horaEn("07:00", "09:00", 1)).toBe("09:00");
  });
  it("redondea al minuto y rellena con ceros", () => {
    expect(horaEn("07:05", "07:35", 1 / 3)).toBe("07:15");
  });
});

describe("avances y masCercano", () => {
  const trazo = [{ lng: 0, lat: 0 }, { lng: 0, lat: 0.001 }, { lng: 0, lat: 0.003 }];
  it("el avance va de 0 a 1 y es proporcional a la distancia", () => {
    const a = avances(trazo);
    expect(a[0]).toBe(0);
    expect(a[2]).toBe(1);
    expect(a[1]).toBeCloseTo(1 / 3, 2);
  });
  it("encuentra el vértice más cercano y su distancia", () => {
    const m = masCercano(trazo, { lng: 0, lat: 0.0011 });
    expect(m.i).toBe(1);
    expect(m.metros).toBeLessThan(15);
  });
  it("distancia: 0.001° de latitud son ~111 m", () => {
    expect(distancia(trazo[0], trazo[1])).toBeGreaterThan(105);
    expect(distancia(trazo[0], trazo[1])).toBeLessThan(115);
  });
});

describe("aJSON / deJSON (Firestore no acepta arreglos anidados)", () => {
  it("ida y vuelta sin perder precisión útil", () => {
    const l = [{ lng: -102.5764123, lat: 21.4271987 }];
    expect(deJSON(aJSON(l))[0].lng).toBeCloseTo(-102.576412, 5);
  });
  it("texto inválido o vacío da lista vacía", () => {
    expect(deJSON("no es json")).toEqual([]);
    expect(deJSON(undefined)).toEqual([]);
  });
});
