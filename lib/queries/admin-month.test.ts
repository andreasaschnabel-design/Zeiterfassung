import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findMany: vi.fn() },
  timeEntry: { groupBy: vi.fn() },
  auditLog: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getAdminMonthOverview } from "./admin-month";

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    name: "Anna",
    email: "anna@x.de",
    isActive: true,
    monthlyLimitHours: 40,
    createdAt: new Date("2026-01-15T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.auditLog.findMany.mockResolvedValue([]);
});

describe("getAdminMonthOverview", () => {
  it("verwendet in groupBy DENSELBEN Rollenfilter wie die users-Abfrage", async () => {
    prismaMock.user.findMany.mockResolvedValue([user()]);
    prismaMock.timeEntry.groupBy.mockResolvedValue([]);
    await getAdminMonthOverview("2026-07");

    const usersWhere = prismaMock.user.findMany.mock.calls[0][0].where;
    const groupWhere = prismaMock.timeEntry.groupBy.mock.calls[0][0].where;
    expect(usersWhere).toEqual({ role: "EMPLOYEE" });
    expect(groupWhere.user).toEqual({ role: "EMPLOYEE" });
  });

  it("aggregiert Summe und Anzahl je Mitarbeiter", async () => {
    prismaMock.user.findMany.mockResolvedValue([user()]);
    prismaMock.timeEntry.groupBy.mockResolvedValue([
      { userId: "u1", _sum: { durationMinutes: 900 }, _count: { _all: 3 } },
    ]);
    const { rows } = await getAdminMonthOverview("2026-07");
    expect(rows[0].totalMinutes).toBe(900);
    expect(rows[0].entryCount).toBe(3);
  });

  it("AK-5: inaktive OHNE Eintraege verschwinden, MIT Eintraegen bleiben", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      user({ id: "aktiv", isActive: true }),
      user({ id: "inaktivLeer", isActive: false }),
      user({ id: "inaktivMitZeit", isActive: false }),
    ]);
    prismaMock.timeEntry.groupBy.mockResolvedValue([
      { userId: "inaktivMitZeit", _sum: { durationMinutes: 120 }, _count: { _all: 1 } },
    ]);
    const { rows } = await getAdminMonthOverview("2026-07");
    const ids = rows.map((r) => r.userId);
    expect(ids).toContain("aktiv");
    expect(ids).toContain("inaktivMitZeit");
    expect(ids).not.toContain("inaktivLeer");
  });

  it("markiert adminEdited, wenn ein Audit von einem Nicht-Eigentuemer stammt", async () => {
    prismaMock.user.findMany.mockResolvedValue([user({ id: "u1" })]);
    prismaMock.timeEntry.groupBy.mockResolvedValue([
      { userId: "u1", _sum: { durationMinutes: 60 }, _count: { _all: 1 } },
    ]);
    prismaMock.auditLog.findMany.mockResolvedValue([
      { changedById: "admin", timeEntry: { userId: "u1" } },
    ]);
    const { rows } = await getAdminMonthOverview("2026-07");
    expect(rows[0].adminEdited).toBe(true);
  });

  it("markiert NICHT, wenn nur der Eigentuemer selbst geaendert hat", async () => {
    prismaMock.user.findMany.mockResolvedValue([user({ id: "u1" })]);
    prismaMock.timeEntry.groupBy.mockResolvedValue([
      { userId: "u1", _sum: { durationMinutes: 60 }, _count: { _all: 1 } },
    ]);
    prismaMock.auditLog.findMany.mockResolvedValue([
      { changedById: "u1", timeEntry: { userId: "u1" } },
    ]);
    const { rows } = await getAdminMonthOverview("2026-07");
    expect(rows[0].adminEdited).toBe(false);
  });
});
