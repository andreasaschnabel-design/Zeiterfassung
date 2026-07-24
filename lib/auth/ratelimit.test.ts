import { describe, it, expect, beforeEach } from "vitest";
import { MAX_LOGIN_ATTEMPTS } from "@/lib/constants";
import {
  __resetRateLimitStore,
  clearRateLimit,
  isRateLimited,
  registerFailure,
} from "./ratelimit";

beforeEach(() => {
  __resetRateLimitStore();
});

describe("Login-Rate-Limit", () => {
  it("ist bei frischem Bezeichner nicht gesperrt", () => {
    expect(isRateLimited("a@b.de")).toBe(false);
  });

  it("sperrt erst den (MAX+1)-ten Versuch", () => {
    // D3: 5 falsche Versuche laufen durch, der 6. wird gesperrt.
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
      expect(isRateLimited("a@b.de")).toBe(false);
      registerFailure("a@b.de");
    }
    expect(isRateLimited("a@b.de")).toBe(true);
  });

  it("setzt nach clearRateLimit (erfolgreicher Login) zurueck", () => {
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) registerFailure("a@b.de");
    expect(isRateLimited("a@b.de")).toBe(true);
    clearRateLimit("a@b.de");
    expect(isRateLimited("a@b.de")).toBe(false);
  });

  it("faellt nach Ablauf des Fensters wieder frei", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) registerFailure("a@b.de", t0);
    expect(isRateLimited("a@b.de", t0)).toBe(true);
    // Weit nach dem Fenster:
    const later = t0 + 60 * 60 * 1000;
    expect(isRateLimited("a@b.de", later)).toBe(false);
  });

  it("trennt Bezeichner voneinander", () => {
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) registerFailure("a@b.de");
    expect(isRateLimited("a@b.de")).toBe(true);
    expect(isRateLimited("c@d.de")).toBe(false);
  });
});
