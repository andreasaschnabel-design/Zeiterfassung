import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  timeEntry: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { isoDateToDbDate } from "@/lib/time/dates";
import { findDayConflict } from "./overlap";

function entry(startTime: string, endTime: string, id = "e1") {
  return { id, startTime, endTime };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findDayConflict (halboffene Intervalle)", () => {
  it("erkennt eine echte Ueberschneidung", async () => {
    prismaMock.timeEntry.findMany.mockResolvedValue([entry("09:00", "13:00")]);
    const conflict = await findDayConflict({
      userId: "u1",
      workDateISO: "2026-07-24",
      startTime: "12:00",
      endTime: "14:00",
    });
    expect(conflict?.id).toBe("e1");
  });

  it("laesst lueckenlos anschliessende Zeiten zu (13:00 Grenze)", async () => {
    prismaMock.timeEntry.findMany.mockResolvedValue([entry("09:00", "13:00")]);
    const conflict = await findDayConflict({
      userId: "u1",
      workDateISO: "2026-07-24",
      startTime: "13:00",
      endTime: "17:00",
    });
    expect(conflict).toBeNull();
  });

  it("uebergibt workDate als isoDateToDbDate (nicht new Date(iso))", async () => {
    prismaMock.timeEntry.findMany.mockResolvedValue([]);
    await findDayConflict({
      userId: "u1",
      workDateISO: "2026-07-24",
      startTime: "08:00",
      endTime: "09:00",
    });
    const where = prismaMock.timeEntry.findMany.mock.calls[0][0].where;
    expect(where.workDate.getTime()).toBe(
      isoDateToDbDate("2026-07-24").getTime(),
    );
  });

  it("schliesst excludeEntryId aus (US-04-Uebergabe)", async () => {
    prismaMock.timeEntry.findMany.mockResolvedValue([]);
    await findDayConflict({
      userId: "u1",
      workDateISO: "2026-07-24",
      startTime: "08:00",
      endTime: "09:00",
      excludeEntryId: "self",
    });
    const where = prismaMock.timeEntry.findMany.mock.calls[0][0].where;
    expect(where.id).toEqual({ not: "self" });
  });

  it("scheitert laut bei unparsebarem DB-Wert (kein stilles NaN)", async () => {
    prismaMock.timeEntry.findMany.mockResolvedValue([entry("99:99", "13:00")]);
    await expect(
      findDayConflict({
        userId: "u1",
        workDateISO: "2026-07-24",
        startTime: "10:00",
        endTime: "11:00",
      }),
    ).rejects.toThrow();
  });
});
