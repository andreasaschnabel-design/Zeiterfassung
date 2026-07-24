import { describe, it, expect } from "vitest";
import { WARNING_THRESHOLD } from "@/lib/constants";
import { evaluateLimit } from "./limit";

const LIMIT = 2400; // 40 Std in Minuten

describe("evaluateLimit (AK-4)", () => {
  it("OK unter 90 %", () => {
    const r = evaluateLimit(2000, LIMIT);
    expect(r.status).toBe("OK");
  });

  it("WARNING genau ab 90 %", () => {
    const r = evaluateLimit(Math.round(LIMIT * WARNING_THRESHOLD), LIMIT);
    expect(r.status).toBe("WARNING");
  });

  it("EXCEEDED ab 100 %", () => {
    expect(evaluateLimit(LIMIT, LIMIT).status).toBe("EXCEEDED");
    expect(evaluateLimit(LIMIT + 1, LIMIT).status).toBe("EXCEEDED");
  });

  it("Prozent wird NICHT gekappt, Balken schon", () => {
    const r = evaluateLimit(LIMIT * 1.2, LIMIT);
    expect(Math.round(r.percent)).toBe(120);
    expect(r.barPercent).toBe(100);
  });

  it("faengt limitMinutes <= 0 ab (keine Division durch null)", () => {
    const r = evaluateLimit(500, 0);
    expect(r.status).toBe("OK");
    expect(r.percent).toBe(0);
    expect(Number.isFinite(r.percent)).toBe(true);
  });
});
