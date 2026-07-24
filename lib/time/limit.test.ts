import { describe, it, expect } from "vitest";
import { WARNING_THRESHOLD } from "@/lib/constants";
import { evaluateCentsLimit, evaluateLimit } from "./limit";

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

describe("evaluateCentsLimit teilt die Schwelle mit evaluateLimit", () => {
  it("liefert bei gleicher ratio denselben Status (an der 90%-Schwelle)", () => {
    // 90 % in Minuten und in Cent muessen identisch bewertet werden.
    const minutes = evaluateLimit(Math.round(2400 * WARNING_THRESHOLD), 2400);
    const cents = evaluateCentsLimit(
      Math.round(667200 * WARNING_THRESHOLD),
      667200, // 12 * 55600
    );
    expect(cents.status).toBe(minutes.status);
    expect(cents.status).toBe("WARNING");
  });

  it("EXCEEDED ab 100 % (Cent)", () => {
    expect(evaluateCentsLimit(667200, 667200).status).toBe("EXCEEDED");
  });
});
