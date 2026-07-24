import { prisma } from "@/lib/prisma";
import { dbDateToIso, monthRange } from "@/lib/time/dates";

// architecture.md, zentrale Funktionen: getMonth(userId, ym) ist JEDE
// Monatsabfrage. US-08: `selfRecorded` wird hier abgeleitet; `createdById`
// verlaesst die Query-Schicht NICHT.

export type MonthEntry = {
  id: string;
  workDate: string; // ISO "YYYY-MM-DD"
  startTime: string;
  endTime: string;
  breakMinutes: number;
  durationMinutes: number;
  note: string | null;
  /** true, wenn der Mitarbeiter den Eintrag selbst erfasst hat. */
  selfRecorded: boolean;
};

export type MonthData = {
  ym: string;
  entries: MonthEntry[];
  totalMinutes: number;
};

/**
 * US-05 (Kritisch): EINE Abfrage. Die Monatssumme wird aus der geladenen Liste
 * per reduce gebildet — nicht als getrenntes Aggregat, das auseinanderlaufen
 * koennte. `deletedAt: null` kommt aus der Middleware (DE-04). AK-6: nur eigene.
 */
export async function getMonth(
  userId: string,
  ym: string,
): Promise<MonthData> {
  const { gte, lt } = monthRange(ym);

  const rows = await prisma.timeEntry.findMany({
    where: { userId, workDate: { gte, lt } },
    orderBy: [{ workDate: "asc" }, { startTime: "asc" }],
  });

  const entries: MonthEntry[] = rows.map((r) => ({
    id: r.id,
    workDate: dbDateToIso(r.workDate),
    startTime: r.startTime,
    endTime: r.endTime,
    breakMinutes: r.breakMinutes,
    durationMinutes: r.durationMinutes,
    note: r.note,
    selfRecorded: r.createdById === r.userId,
  }));

  const totalMinutes = rows.reduce((sum, r) => sum + r.durationMinutes, 0);

  return { ym, entries, totalMinutes };
}
