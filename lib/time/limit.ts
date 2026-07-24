import { WARNING_THRESHOLD } from "@/lib/constants";

// architecture.md, zentrale Funktionen: evaluateLimit() (Minuten) und
// evaluateCentsLimit() (Cent) liefern den Ampelstatus. Beide TEILEN sich die
// Schwelle WARNING_THRESHOLD ueber die gemeinsame interne Funktion — ein Test
// bindet beide aneinander (US-14).

export type LimitStatus = "OK" | "WARNING" | "EXCEEDED";

export type LimitEvaluation = {
  status: LimitStatus;
  /** Prozentwert, NICHT gekappt (kann > 100 sein). Fuer die Anzeige. */
  percent: number;
  /** Auf 0..100 gekappt — nur fuer die Balkenbreite. */
  barPercent: number;
};

// Gemeinsame Bewertung. `limit <= 0` wird abgefangen (keine Division durch null).
function evaluate(value: number, limit: number): LimitEvaluation {
  if (limit <= 0) {
    return { status: "OK", percent: 0, barPercent: 0 };
  }
  const ratio = value / limit;
  const percent = ratio * 100; // nicht kappen
  const barPercent = Math.min(100, Math.max(0, percent)); // Balken kappen

  let status: LimitStatus = "OK";
  if (ratio >= 1) status = "EXCEEDED";
  else if (ratio >= WARNING_THRESHOLD) status = "WARNING";

  return { status, percent, barPercent };
}

/** US-05/AK-4: gelb ab 90 %, rot ab 100 % (Minuten). */
export function evaluateLimit(
  totalMinutes: number,
  limitMinutes: number,
): LimitEvaluation {
  return evaluate(totalMinutes, limitMinutes);
}

/** US-14: dieselbe Schwelle, in Cent. */
export function evaluateCentsLimit(
  totalCents: number,
  limitCents: number,
): LimitEvaluation {
  return evaluate(totalCents, limitCents);
}
