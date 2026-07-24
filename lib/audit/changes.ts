import { formatMinutes } from "@/lib/time/core";
import type { AuditAction } from "@prisma/client";

// US-11: Lesbare deutsche Darstellung eines Audit-Eintrags (AK-6), kein Roh-JSON.

const FIELDS: { key: string; label: string }[] = [
  { key: "workDate", label: "Datum" },
  { key: "startTime", label: "Beginn" },
  { key: "endTime", label: "Ende" },
  { key: "breakMinutes", label: "Pause" },
  { key: "durationMinutes", label: "Dauer" },
  { key: "note", label: "Notiz" },
];

function formatValue(key: string, value: unknown): string {
  if (key === "note") {
    if (value === null || value === undefined || value === "") return "(keine)";
    return String(value);
  }
  if (key === "breakMinutes") return `${value} min`;
  if (key === "durationMinutes") return `${formatMinutes(Number(value))} Std`;
  return String(value);
}

export type FieldChange = {
  label: string;
  from: string | null; // null = fuer diesen Fall nicht vorhanden (z. B. CREATE)
  to: string | null;
};

/**
 * US-11 (Kritisch): DREI GETRENNTE FAELLE. Kein `??`/`||`-Fallback ueber die
 * Faelle hinweg. Bei UPDATE ist `null` ein gueltiger Zielwert (entfernte Notiz)
 * und `0` ein gueltiger Wert (Pause auf 0). `newV[f] ?? oldV[f]` bzw.
 * `newV[f] || oldV[f]` wuerden diese als "unveraendert" darstellen — das
 * Protokoll wuerde luegen. Die Werte werden deshalb je Fall DIREKT genommen.
 */
export function buildChanges(
  action: AuditAction,
  oldValues: unknown,
  newValues: unknown,
): FieldChange[] {
  const oldV = (oldValues ?? {}) as Record<string, unknown>;
  const newV = (newValues ?? {}) as Record<string, unknown>;

  switch (action) {
    case "CREATE":
      // Nur der neue Zustand.
      return FIELDS.filter((f) => f.key in newV).map((f) => ({
        label: f.label,
        from: null,
        to: formatValue(f.key, newV[f.key]),
      }));

    case "DELETE":
      // Nur der (vollstaendige) alte Zustand.
      return FIELDS.filter((f) => f.key in oldV).map((f) => ({
        label: f.label,
        from: formatValue(f.key, oldV[f.key]),
        to: null,
      }));

    case "UPDATE":
      // Nur die geaenderten Felder; alt und neu DIREKT, ohne Fallback.
      return FIELDS.filter((f) => f.key in newV || f.key in oldV).map((f) => ({
        label: f.label,
        from: formatValue(f.key, oldV[f.key]),
        to: formatValue(f.key, newV[f.key]),
      }));
  }
}

export function actionLabel(action: AuditAction): string {
  switch (action) {
    case "CREATE":
      return "Angelegt";
    case "UPDATE":
      return "Geaendert";
    case "DELETE":
      return "Geloescht";
  }
}
