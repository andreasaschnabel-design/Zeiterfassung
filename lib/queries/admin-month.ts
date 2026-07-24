import { prisma } from "@/lib/prisma";
import { monthRange, todayISO } from "@/lib/time/dates";

// architecture.md, zentrale Funktionen: getAdminMonthOverview(ym) —
// Mehr-Mitarbeiter-Aggregation fuer US-06.

export type AdminMonthRow = {
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  monthlyLimitHours: number;
  totalMinutes: number;
  entryCount: number;
  /** Kritisch: markiert, wenn der Admin einen Eintrag angelegt/geaendert hat. */
  adminEdited: boolean;
};

export type AdminMonthOverview = {
  ym: string;
  rows: AdminMonthRow[];
  employeeCount: number;
  minMonth: string;
};

export async function getAdminMonthOverview(
  ym: string,
): Promise<AdminMonthOverview> {
  const { gte, lt } = monthRange(ym);

  const [users, grouped, adminAudits] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    // Kritisch: DERSELBE Rollenfilter wie die users-Abfrage. Sonst enthaelt die
    // Aggregation Eintraege, die in keiner Zeile erscheinen. deletedAt:null
    // kommt aus der Middleware (groupBy ist abgedeckt).
    prisma.timeEntry.groupBy({
      by: ["userId"],
      where: { workDate: { gte, lt }, user: { role: "EMPLOYEE" } },
      _sum: { durationMinutes: true },
      _count: { _all: true },
    }),
    // Admin-Beteiligung: Audit-Eintraege zu (nicht geloeschten) Monats-
    // eintraegen, die NICHT vom Eigentuemer stammen (Anlage/Aenderung durch
    // Admin). changedById !== userId.
    prisma.auditLog.findMany({
      where: {
        timeEntry: {
          workDate: { gte, lt },
          deletedAt: null,
          user: { role: "EMPLOYEE" },
        },
      },
      select: { changedById: true, timeEntry: { select: { userId: true } } },
    }),
  ]);

  const sums = new Map(
    grouped.map((g) => [
      g.userId,
      { minutes: g._sum.durationMinutes ?? 0, count: g._count._all },
    ]),
  );

  const adminTouched = new Set<string>();
  for (const a of adminAudits) {
    if (a.changedById !== a.timeEntry.userId) adminTouched.add(a.timeEntry.userId);
  }

  const rows: AdminMonthRow[] = users
    .map((u) => {
      const agg = sums.get(u.id) ?? { minutes: 0, count: 0 };
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        monthlyLimitHours: Number(u.monthlyLimitHours),
        totalMinutes: agg.minutes,
        entryCount: agg.count,
        adminEdited: adminTouched.has(u.id),
      };
    })
    // AK-5: Inaktive bleiben sichtbar, WENN sie Eintraege im Zeitraum haben
    // (entryCount > 0) — nicht ueber ein Austrittsdatum.
    .filter((r) => r.isActive || r.entryCount > 0);

  const minMonth = users.length
    ? todayISO(
        users.reduce(
          (min, u) => (u.createdAt < min ? u.createdAt : min),
          users[0].createdAt,
        ),
      ).slice(0, 7)
    : ym;

  return { ym, rows, employeeCount: users.length, minMonth };
}
