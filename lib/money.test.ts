import { describe, it, expect } from "vitest";
import { eurosToCents, formatCents, formatEuros, grossPay } from "./money";

describe("eurosToCents / formatEuros / formatCents", () => {
  it("parst Punkt und Komma", () => {
    expect(eurosToCents("13.90")).toBe(1390);
    expect(eurosToCents("13,90")).toBe(1390);
    expect(eurosToCents("556")).toBe(55600);
  });

  it("formatiert deutsch", () => {
    expect(formatEuros(1390)).toBe("13,90");
    expect(formatCents(1390)).toBe("13,90 €");
  });
});

describe("grossPay (Cent, eine Rundung am Ende)", () => {
  it("40 Std zu 13,90 € = 556,00 €", () => {
    // 2400 min * 1390 ct / 60 = 55600 ct
    expect(grossPay(2400, 1390)).toBe(55600);
  });

  it("rundet genau einmal am Ende (nicht ueber Dezimalstunden)", () => {
    // 37 min * 1390 / 60 = 857,1666... -> 857 ct
    expect(grossPay(37, 1390)).toBe(857);
    // 90 min * 1333 / 60 = 1999,5 -> 2000 ct
    expect(grossPay(90, 1333)).toBe(2000);
  });

  it("liefert 0 bei 0 Minuten", () => {
    expect(grossPay(0, 1390)).toBe(0);
  });
});
