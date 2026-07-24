import { describe, it, expect } from "vitest";
import {
  arbeitszeitHinweise,
  calculateDuration,
  formatDecimalHours,
  formatMinutes,
  grossMinutes,
  isValidHHMM,
  parseHHMM,
} from "./core";

describe("parseHHMM / isValidHHMM", () => {
  it("parst gueltige Zeiten", () => {
    expect(parseHHMM("00:00")).toBe(0);
    expect(parseHHMM("09:30")).toBe(570);
    expect(parseHHMM("23:59")).toBe(1439);
  });

  it("lehnt '99:99' ab (regexkonform, aber ungueltig)", () => {
    expect(isValidHHMM("99:99")).toBe(false);
    expect(() => parseHHMM("99:99")).toThrow();
  });

  it("lehnt weitere Unfug-Werte ab (laut scheitern, kein NaN)", () => {
    for (const bad of ["24:00", "7:5", "7:00", "", "0730", "12:60", "ab:cd"]) {
      expect(isValidHHMM(bad)).toBe(false);
      expect(() => parseHHMM(bad)).toThrow();
    }
  });
});

describe("grossMinutes / calculateDuration", () => {
  it("Brutto = Ende - Beginn", () => {
    expect(grossMinutes("09:00", "17:00")).toBe(480);
  });

  it("Dauer = (Ende - Beginn) - Pause", () => {
    expect(
      calculateDuration({ startTime: "09:00", endTime: "17:00", breakMinutes: 30 }),
    ).toBe(450);
  });
});

describe("formatMinutes", () => {
  it("formatiert H:MM", () => {
    expect(formatMinutes(450)).toBe("7:30");
    expect(formatMinutes(60)).toBe("1:00");
    expect(formatMinutes(5)).toBe("0:05");
  });
});

describe("formatDecimalHours", () => {
  it("formatiert Dezimalstunden mit Komma", () => {
    expect(formatDecimalHours(450)).toBe("7,50");
    expect(formatDecimalHours(2400)).toBe("40,00");
    expect(formatDecimalHours(0)).toBe("0,00");
  });
});

describe("arbeitszeitHinweise (Warnungen, keine Ablehnung)", () => {
  it("keine Hinweise bei kurzer Arbeitszeit", () => {
    expect(arbeitszeitHinweise(300, 0)).toEqual([]);
  });

  it("30-Min-Hinweis ab mehr als 6 Std ohne ausreichende Pause", () => {
    const h = arbeitszeitHinweise(6 * 60 + 1, 15);
    expect(h.some((m) => m.includes("30 Minuten"))).toBe(true);
  });

  it("kein 30-Min-Hinweis, wenn Pause ausreicht", () => {
    expect(arbeitszeitHinweise(6 * 60 + 1, 30)).toEqual([]);
  });

  it("45-Min-Hinweis ab mehr als 9 Std", () => {
    const h = arbeitszeitHinweise(9 * 60 + 1, 30);
    expect(h.some((m) => m.includes("45 Minuten"))).toBe(true);
  });

  it("§3-Hinweis ab mehr als 10 Std", () => {
    const h = arbeitszeitHinweise(10 * 60 + 1, 45);
    expect(h.some((m) => m.includes("10 Stunden"))).toBe(true);
  });
});
