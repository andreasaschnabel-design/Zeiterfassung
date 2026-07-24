import { WARNING_THRESHOLD } from "@/lib/constants";

// architecture.md, zentrale Funktionen: evaluateLimit() ist die einzige Quelle
// fuer den Ampelstatus (Minuten). evaluateCentsLimit() (Cent, US-14) teilt sich
// spaeter WARNING_THRESHOLD mit dieser Funktion.

export type LimitStatus = "OK" | "WARNING" | "EXCEEDED";

export type LimitEvaluation = {
  status: LimitStatus;
  /** Prozentwert, NICHT gekappt (kann > 100 sein). Fuer die Anzeige. */
  percent: number;
  /** Auf 0..100 gekappt — nur fuer die Balkenbreite. */
  barPercent: number;
};

/**
 * AK-4: gelb ab 90 %, rot ab 100 %.
 * `limitMinutes <= 0` wird abgefangen (keine Division durch null).
 */
export function evaluateLimit(
  totalMinutes: number,
  limitMinutes: number,
): LimitEvaluation {
  if (limitMinutes <= 0) {
    return { status: "OK", percent: 0, barPercent: 0 };
  }

  const ratio = totalMinutes / limitMinutes;
  const percent = ratio * 100; // nicht kappen
  const barPercent = Math.min(100, Math.max(0, percent)); // Balken kappen

  let status: LimitStatus = "OK";
  if (ratio >= 1) status = "EXCEEDED";
  else if (ratio >= WARNING_THRESHOLD) status = "WARNING";

  return { status, percent, barPercent };
}
