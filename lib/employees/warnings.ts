// US-10 (Kritisch): Mindestlohn- und Grenzwertpruefung WARNEN, blockieren
// nicht. Serverseitig ausgewertet (nicht nur im Client).
//
// Geld wird in Cent (Integer) verglichen (DE-03). Die vollstaendige
// Cent-Arithmetik (grossPay) ist in US-08 zu Hause; hier nur die fuer die
// Warnungen noetigen Hilfen.

/** Euro-Decimal ("13,90" | "13.90") -> Integer-Cent. Wirft bei Unfug. */
export function eurosToCents(input: string): number {
  const norm = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(norm)) {
    throw new Error(`Kein gueltiger Betrag: ${input}`);
  }
  const value = Number(norm);
  if (!Number.isFinite(value)) {
    throw new Error(`Kein gueltiger Betrag: ${input}`);
  }
  return Math.round(value * 100);
}

/** Cent -> "12,34 €" (deutsche Konvention). */
export function formatCents(cents: number): string {
  const euros = (cents / 100).toFixed(2).replace(".", ",");
  return `${euros} €`;
}

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
