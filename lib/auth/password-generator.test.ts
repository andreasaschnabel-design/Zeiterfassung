import { describe, it, expect } from "vitest";
import { WORDS } from "./wordlist";
import { generatePassword } from "./password-generator";

describe("generatePassword", () => {
  it("Voraussetzung fuer Bias-Freiheit: 2^32 ist glatt durch WORDS.length teilbar", () => {
    expect(2 ** 32 % WORDS.length).toBe(0);
  });

  it("liefert vier Woerter aus der Liste plus zwei Ziffern", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword();
      const parts = pw.split("-");
      expect(parts).toHaveLength(5);
      for (let j = 0; j < 4; j++) {
        expect(WORDS).toContain(parts[j]);
      }
      expect(parts[4]).toMatch(/^\d{2}$/);
    }
  });

  it("erfuellt die Mindestlaenge (>= 10 Zeichen, AK-3)", () => {
    for (let i = 0; i < 50; i++) {
      expect(generatePassword().length).toBeGreaterThanOrEqual(10);
    }
  });
});
