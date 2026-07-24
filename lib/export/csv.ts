import type { MonthEntry } from "@/lib/queries/month";
import { formatDecimalHours } from "@/lib/time/core";

// US-09 (Kritisch): BOM, Semikolon, CRLF, Dezimalkomma. Doppelte Dauerspalte
// (Dezimalstunden zum Ablesen, Minuten als Integer zur Weiterverarbeitung).
// KEINE Summenzeile — sie bricht jeden Import.

const BOM = "﻿";
const CRLF = "\r\n";

const SINGLE_HEADERS = [
  "Datum",
  "Beginn",
  "Ende",
  "Pause (min)",
  "Dauer (Std)",
  "Dauer (min)",
  "Notiz",
  "Erfasst durch",
];

function entryRow(e: MonthEntry): string[] {
  return [
    e.workDate,
    e.startTime,
    e.endTime,
    String(e.breakMinutes),
    formatDecimalHours(e.durationMinutes), // Dezimalstunden mit Komma
    String(e.durationMinutes), // Minuten als Integer
    e.note ?? "",
    // Erfassungsspalte: Mitarbeiter (selbst) oder Arbeitgeber (Admin).
    e.selfRecorded ? "Mitarbeiter" : "Arbeitgeber",
  ];
}

function csvField(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function renderCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((cols) => cols.map(csvField).join(";"));
  return BOM + lines.join(CRLF) + CRLF;
}

/** AK-5: CSV je Mitarbeiter und Monat. */
export function buildMonthCsv(entries: MonthEntry[]): string {
  return renderCsv(SINGLE_HEADERS, entries.map(entryRow));
}

/** AK-6: Sammel-CSV ueber alle Mitarbeiter (zusaetzliche Spalte "Mitarbeiter"). */
export function buildCollectiveCsv(
  groups: { name: string; entries: MonthEntry[] }[],
): string {
  const headers = ["Mitarbeiter", ...SINGLE_HEADERS];
  const rows = groups.flatMap((g) =>
    g.entries.map((e) => [g.name, ...entryRow(e)]),
  );
  return renderCsv(headers, rows);
}
