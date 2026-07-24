import { describe, it, expect, beforeEach } from "vitest";
import { MAX_LOGIN_ATTEMPTS } from "@/lib/constants";
import {
  __resetRateLimitStore,
  clearRateLimit,
  isRateLimited,
  registerFailure,
} from "./ratelimit";

// Ohne UPSTASH_*-Env greift der prozesslokale Fallback-Zaehler.
beforeEach(() => {
  __resetRateLimitStore();
});

describe("Login-Rate-Limit (Fallback-Zaehler)", () => {
  it("ist bei frischem Bezeichner nicht gesperrt", async () => {
    expect(await isRateLimited("a@b.de")).toBe(false);
  });

  it("sperrt erst den (MAX+1)-ten Versuch", async () => {
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
      expect(await isRateLimited("a@b.de")).toBe(false);
      await registerFailure("a@b.de");
    }
    expect(await isRateLimited("a@b.de")).toBe(true);
  });

  it("setzt nach clearRateLimit (erfolgreicher Login) zurueck", async () => {
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) await registerFailure("a@b.de");
    expect(await isRateLimited("a@b.de")).toBe(true);
    await clearRateLimit("a@b.de");
    expect(await isRateLimited("a@b.de")).toBe(false);
  });

  it("faellt nach Ablauf des Fensters wieder frei", async () => {
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) await registerFailure("a@b.de", t0);
    expect(await isRateLimited("a@b.de", t0)).toBe(true);
    const later = t0 + 60 * 60 * 1000;
    expect(await isRateLimited("a@b.de", later)).toBe(false);
  });

  it("trennt Bezeichner voneinander", async () => {
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) await registerFailure("a@b.de");
    expect(await isRateLimited("a@b.de")).toBe(true);
    expect(await isRateLimited("c@d.de")).toBe(false);
  });
});
