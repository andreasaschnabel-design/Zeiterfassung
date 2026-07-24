import { describe, it, expect } from "vitest";
import {
  eurosToCents,
  formatCents,
  suggestMonthlyLimit,
  wageWarnings,
} from "./warnings";

describe("eurosToCents", () => {
  it("akzeptiert Punkt und Komma", () => {
    expect(eurosToCents("13.90")).toBe(1390);
    expect(eurosToCents("13,90")).toBe(1390);
    expect(eurosToCents("556")).toBe(55600);
  });

  it("wirft bei Unfug", () => {
    expect(() => eurosToCents("abc")).toThrow();
    expect(() => eurosToCents("")).toThrow();
  });
});

describe("formatCents", () => {
  it("formatiert deutsch mit Euro-Zeichen", () => {
    expect(formatCents(1390)).toBe("13,90 €");
    expect(formatCents(55600)).toBe("556,00 €");
  });
});

describe("suggestMonthlyLimit", () => {
  it("556 / 13,90 = 40 (abgerundet)", () => {
    expect(suggestMonthlyLimit("556", "13.90")).toBe(40);
  });

  it("rundet ab, nicht kaufmaennisch", () => {
    // 556 / 12,00 = 46,33... → 46
    expect(suggestMonthlyLimit("556", "12.00")).toBe(46);
  });

  it("faengt Satz 0 ab", () => {
    expect(suggestMonthlyLimit("556", "0")).toBe(0);
  });
});

describe("wageWarnings", () => {
  const base = { minimumWage: "13.90", earningsLimit: "556" };

  it("keine Warnung bei Satz = Mindestlohn und Limit an der Grenze", () => {
    expect(
      wageWarnings({ ...base, hourlyRate: "13.90", monthlyLimitHours: 40 }),
    ).toEqual([]);
  });

  it("warnt bei Satz unter Mindestlohn", () => {
    const w = wageWarnings({
      ...base,
      hourlyRate: "12.00",
      monthlyLimitHours: 40,
    });
    expect(w.some((m) => m.includes("Mindestlohn"))).toBe(true);
  });

  it("warnt, wenn Limit x Satz die Entgeltgrenze uebersteigt", () => {
    const w = wageWarnings({
      ...base,
      hourlyRate: "13.90",
      monthlyLimitHours: 41,
    });
    expect(w.some((m) => m.includes("Entgeltgrenze"))).toBe(true);
  });
});
