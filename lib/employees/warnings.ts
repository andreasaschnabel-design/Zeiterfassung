// US-10 (Kritisch): Mindestlohn- und Grenzwertpruefung WARNEN, blockieren
// nicht. Serverseitig ausgewertet (nicht nur im Client).
//
// Geld wird in Cent (Integer) verglichen (DE-03). Die Cent-Hilfen leben in
// /lib/money (kanonische Stelle fuer jede Geldrechnung).

import { eurosToCents, formatCents } from "@/lib/money";

/**
 * Limit-Vorschlag beim Anlegen: earningsLimit / hourlyRate, abgerundet.
 * 556 / 13,90 = 40,0 → 40.
 */
export function suggestMonthlyLimit(
  earningsLimit: string,
  hourlyRate: string,
): number {
  const limitCents = eurosToCents(earningsLimit);
  const rateCents = eurosToCents(hourlyRate);
  if (rateCents <= 0) return 0;
  return Math.floor(limitCents / rateCents);
}

/**
 * Warnungen (keine Blocker) fuer eine Mitarbeiter-Konfiguration.
 * - Stundensatz unter Mindestlohn
 * - Monatslimit x Stundensatz ueber der Entgeltgrenze
 */
export function wageWarnings(params: {
  hourlyRate: string;
  monthlyLimitHours: number;
  minimumWage: string;
  earningsLimit: string;
}): string[] {
  const warnings: string[] = [];

  const rateCents = eurosToCents(params.hourlyRate);
  const minCents = eurosToCents(params.minimumWage);
  if (rateCents < minCents) {
    warnings.push(
      `Stundensatz (${formatCents(rateCents)}) liegt unter dem Mindestlohn (${formatCents(minCents)}).`,
    );
  }

  const limitCents = eurosToCents(params.earningsLimit);
  const monthlyPayCents = Math.round(params.monthlyLimitHours * rateCents);
  if (monthlyPayCents > limitCents) {
    warnings.push(
      `Monatslimit × Stundensatz (${formatCents(monthlyPayCents)}) uebersteigt die Entgeltgrenze (${formatCents(limitCents)}).`,
    );
  }

  return warnings;
}
