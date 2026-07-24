import type { TimeEntrySnapshot } from "@/lib/audit/snapshot";

// architecture.md, zentrale Funktionen: diffEntry() — Audit-Diff, `null` bei
// Nulländerung (kein Protokollrauschen).

export type EntryDiff = {
  old: Partial<TimeEntrySnapshot>;
  new: Partial<TimeEntrySnapshot>;
};

/**
 * Vergleicht zwei Zustaende und liefert nur die geaenderten Felder in `old`/`new`
 * — oder `null`, wenn sich nichts geaendert hat.
 *
 * Strikter Vergleich (`!==`). `null` ist ein gueltiger Zielwert (entfernte
 * Notiz) und wird als Aenderung erkannt — kein `??`/`||`-Fallback, der eine
 * Loeschung als "unveraendert" darstellen wuerde (vgl. US-11).
 */
export function diffEntry(
  before: TimeEntrySnapshot,
  after: TimeEntrySnapshot,
): EntryDiff | null {
  const old: Record<string, unknown> = {};
  const next: Record<string, unknown> = {};
  let changed = false;

  for (const key of Object.keys(after) as (keyof TimeEntrySnapshot)[]) {
    if (before[key] !== after[key]) {
      old[key] = before[key];
      next[key] = after[key];
      changed = true;
    }
  }

  return changed ? { old, new: next } : null;
}
