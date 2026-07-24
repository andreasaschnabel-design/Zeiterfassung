import type { TimeEntry } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isoDateToDbDate } from "@/lib/time/dates";
import { parseHHMM } from "@/lib/time/core";

// architecture.md, zentrale Funktionen: findDayConflict() ist die EINZIGE
// Ueberschneidungspruefung — fuer CREATE (US-02) und UPDATE (US-04).

export type DayConflictParams = {
  userId: string;
  workDateISO: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  /**
   * US-04-Uebergabe: beim Bearbeiten den eigenen Eintrag ausschliessen —
   * sonst ueberschneidet sich jeder Eintrag mit sich selbst.
   */
  excludeEntryId?: string;
};

/**
 * Liefert einen kollidierenden Eintrag desselben Tages oder `null`.
 *
 * - `isoDateToDbDate()` in der where-Klausel (Kritisch), nicht `new Date(iso)`.
 * - `deletedAt: null` kommt aus der Prisma-Middleware (DE-04).
 * - Halboffene Intervalle: `a.start < b.end && b.start < a.end`. 09:00-13:00 und
 *   13:00-17:00 schliessen lueckenlos an und sind KEIN Konflikt.
 * - `parseHHMM` wirft bei unparsebaren DB-Werten (laut scheitern, kein NaN).
 */
export async function findDayConflict(
  params: DayConflictParams,
): Promise<TimeEntry | null> {
  const sameDay = await prisma.timeEntry.findMany({
    where: {
      userId: params.userId,
      workDate: isoDateToDbDate(params.workDateISO),
      ...(params.excludeEntryId ? { id: { not: params.excludeEntryId } } : {}),
    },
  });

  const newStart = parseHHMM(params.startTime);
  const newEnd = parseHHMM(params.endTime);

  for (const entry of sameDay) {
    const start = parseHHMM(entry.startTime);
    const end = parseHHMM(entry.endTime);
    if (newStart < end && start < newEnd) {
      return entry;
    }
  }
  return null;
}
