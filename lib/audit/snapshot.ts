import type { TimeEntry } from "@prisma/client";
import { dbDateToIso } from "@/lib/time/dates";

// Fachlicher Zustand eines Eintrags fuer das AuditLog (newValues/oldValues).
// Nur die inhaltlichen Felder, kein id/createdAt/updatedAt-Rauschen. `workDate`
// als ISO-String, damit das Protokoll ohne Date-Deserialisierung lesbar bleibt.
export type TimeEntrySnapshot = {
  workDate: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  durationMinutes: number;
  note: string | null;
};

export function timeEntrySnapshot(entry: TimeEntry): TimeEntrySnapshot {
  return {
    workDate: dbDateToIso(entry.workDate),
    startTime: entry.startTime,
    endTime: entry.endTime,
    breakMinutes: entry.breakMinutes,
    durationMinutes: entry.durationMinutes,
    note: entry.note,
  };
}
