import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  timeEntry: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getYear, summarizeYear, type YearData } from "./year";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getYear", () => {
  it("liefert 12 Buckets, auch leere/zukuenftige", async () => {
    prismaMock.timeEntry.findMany.mockResolvedValue([
      { workDate: new Date(Date.UTC(2026, 0, 5)), durationMinutes: 120 }, // Jan
      { workDate: new Date(Date.UTC(2026, 0, 6)), durationMinutes: 60 }, // Jan
      { workDate: new Date(Date.UTC(2026, 2, 3)), durationMinutes: 300 }, // Maerz
    ]);
    const data = await getYear("u1", 2026);
    expect(data.months).toHaveLength(12);
    expect(data.months[0]).toEqual({ ym: "2026-01", minutes: 180 });
    expect(data.months[2].minutes).toBe(300);
    expect(data.months[11].minutes).toBe(0); // Dezember leer
    expect(data.totalMinutes).toBe(480);
  });
});

describe("summarizeYear (Jahresbetrag AUS MINUTEN)", () => {
  function data(minutesPerMonth: number): YearData {
    return {
      year: 2026,
      months: Array.from({ length: 12 }, (_, i) => ({
        ym: `2026-${String(i + 1).padStart(2, "0")}`,
        minutes: minutesPerMonth,
      })),
      totalMinutes: minutesPerMonth * 12,
    };
  }

  it("rechnet den Jahresbetrag aus der Minutensumme, nicht aus 12 Rundungen", () => {
    // 37 min/Monat bei 13,90 €: grossPay(37,1390)=857 -> Summe 10284.
    // Aus Minuten: grossPay(444,1390)=10286. Differenz -2 Cent.
    const s = summarizeYear(data(37), 1390, 55600);
    expect(s.monthlySumCents).toBe(10284);
    expect(s.totalGrossCents).toBe(10286);
    expect(s.roundingDiffCents).toBe(-2);
  });

  it("bildet das Jahreslimit als 12 x Monatslimit", () => {
    const s = summarizeYear(data(0), 1390, 55600);
    expect(s.yearLimitCents).toBe(667200);
  });

  it("zaehlt monthsOverLimit nur nachrichtlich", () => {
    // 40 Std/Monat = 2400 min -> 55600 ct = Limit (nicht darueber).
    expect(summarizeYear(data(2400), 1390, 55600).monthsOverLimit).toBe(0);
    // 41 Std/Monat = 2460 min -> 56990 ct > 55600 -> alle 12 darueber.
    expect(summarizeYear(data(2460), 1390, 55600).monthsOverLimit).toBe(12);
  });
});
