import { describe, it, expect } from "vitest";
import {
  DUMMY_HASH,
  hashPassword,
  verifyDummy,
  verifyPassword,
} from "./hash";

describe("hashPassword / verifyPassword", () => {
  it("erzeugt einen Argon2id-Hash mit den vorgegebenen Parametern", async () => {
    const hash = await hashPassword("korrekt-pferd-batterie");
    // AK-6: Argon2id, Parameter m=19456, t=2, p=1.
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it("verifiziert das korrekte Passwort", async () => {
    const hash = await hashPassword("s3hr-geheim");
    expect(await verifyPassword(hash, "s3hr-geheim")).toBe(true);
  });

  it("lehnt ein falsches Passwort ab", async () => {
    const hash = await hashPassword("s3hr-geheim");
    expect(await verifyPassword(hash, "falsch")).toBe(false);
  });

  it("wirft nicht bei unparsebarem Hash, sondern liefert false", async () => {
    expect(await verifyPassword("kein-gueltiger-hash", "egal")).toBe(false);
  });
});

describe("DUMMY_HASH (Timing-Angleichung)", () => {
  it("ist ein gueltiger Argon2id-Hash mit denselben Parametern", () => {
    expect(DUMMY_HASH).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it("verifiziert gegen kein reales Passwort und wirft nicht", async () => {
    // Wichtig: verifyDummy muss durchlaufen (echter Verify-Aufwand),
    // damit die Laufzeit der eines existierenden Nutzers gleicht.
    await expect(verifyDummy("beliebiges-passwort")).resolves.toBeUndefined();
    expect(await verifyPassword(DUMMY_HASH, "beliebiges-passwort")).toBe(false);
  });
});
