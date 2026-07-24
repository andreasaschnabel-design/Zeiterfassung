import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  timeEntry: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { monthRange } from "@/lib/time/dates";
import { getMonth } from "./month";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "e1",
    userId: "u1",
    workDate: new Date(Date.UTC(2026, 6, 10)),
    startTime: "09:00",
    endTime: "17:00",
    breakMinutes: 30,
    durationMinutes: 450,
    note: null,
    createdById: "u1",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getMonth", () => {
  it("stellt EINE Abfrage mit halboffenem Monatsbereich und richtiger Sortierung", async () => {
    prismaMock.timeEntry.findMany.mockResolvedValue([]);
    await getMonth("u1", "2026-07");

    expect(prismaMock.timeEntry.findMany).toHaveBeenCalledTimes(1);
    const arg = prismaMock.timeEntry.findMany.mock.calls[0][0];
    const { gte, lt } = monthRange("2026-07");
    expect(arg.where.userId).toBe("u1");
    expect(arg.where.workDate.gte.getTime()).toBe(gte.getTime());
    expect(arg.where.workDate.lt.getTime()).toBe(lt.getTime());
    expect(arg.orderBy).toEqual([{ workDate: "asc" }, { startTime: "asc" }]);
  });

  it("bildet die Summe per reduce aus der geladenen Liste", async () => {
    prismaMock.timeEntry.findMany.mockResolvedValue([
      row({ id: "a", durationMinutes: 450 }),
      row({ id: "b", durationMinutes: 120 }),
    ]);
    const data = await getMonth("u1", "2026-07");
    expect(data.totalMinutes).toBe(570);
    expect(data.entries).toHaveLength(2);
  });

  it("leitet selfRecorded ab und gibt createdById nicht heraus", async () => {
    prismaMock.timeEntry.findMany.mockResolvedValue([
      row({ id: "self", createdById: "u1", userId: "u1" }),
      row({ id: "byAdmin", createdById: "admin", userId: "u1" }),
    ]);
    const data = await getMonth("u1", "2026-07");
    expect(data.entries[0].selfRecorded).toBe(true);
    expect(data.entries[1].selfRecorded).toBe(false);
    expect("createdById" in data.entries[0]).toBe(false);
  });

  it("wandelt workDate in ISO um", async () => {
    prismaMock.timeEntry.findMany.mockResolvedValue([row()]);
    const data = await getMonth("u1", "2026-07");
    expect(data.entries[0].workDate).toBe("2026-07-10");
  });
});
