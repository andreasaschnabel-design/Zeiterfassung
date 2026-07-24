import { describe, it, expect } from "vitest";
import { WORDS } from "./wordlist";

describe("WORDS", () => {
  it("enthält exakt 1024 Einträge", () =>
    expect(WORDS.length).toBe(1024));                    // Voraussetzung für Bias-Freiheit

  it("ist eine Zweierpotenz", () =>
    expect(Math.log2(WORDS.length) % 1).toBe(0));

  it("enthält keine Duplikate", () =>
    expect(new Set(WORDS).size).toBe(WORDS.length));     // Duplikate senken die Entropie

  it("enthält nur Kleinbuchstaben a–z", () =>
    expect(WORDS.every((w) => /^[a-z]+$/.test(w))).toBe(true));

  it("hält die Längengrenzen ein", () =>
    expect(WORDS.every((w) => w.length >= 4 && w.length <= 7)).toBe(true));

  it("enthält keine bekannten Homophone", () => {
    const HOMOPHONES = [
      ["rad", "rat"], ["meer", "mehr"], ["lied", "lid"],
      ["seite", "saite"], ["waise", "weise"], ["laib", "leib"],
      ["nagel", "nadel"], ["katze", "tatze"], ["stiel", "stil"],
    ];
    for (const pair of HOMOPHONES) {
      expect(pair.filter((w) => WORDS.includes(w as never)).length).toBeLessThan(2);
    }
  });

  it("enthält keine Wörter, die korrekt einen Umlaut hätten", () => {
    // Beim Vorlesen sagt man "Hütte", getippt würde "hutte" — Bruchstelle
    // bei der mündlichen Weitergabe.
    const UMLAUT_STEMS = [
      "buro", "hutte", "kuche", "muhle", "turm", "konig", "korper",
      "gluck", "stuck", "wuste", "mowe", "lowe", "flote", "trane",
    ];
    const found = UMLAUT_STEMS.filter((w) => WORDS.includes(w as never));
    expect(found).toEqual([]);
  });

  it("ist alphabetisch sortiert", () =>
    expect([...WORDS]).toEqual([...WORDS].sort()));
});
