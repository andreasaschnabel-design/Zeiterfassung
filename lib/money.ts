// DE-03: Alle Betraege in Cent (Integer). Niemals Number(Decimal) in
// Geldrechnungen, niemals ueber Dezimalstunden. Rundung genau EINMAL, am Ende.
// Dies ist die kanonische Stelle fuer jede Geldrechnung (architecture.md).

/** Euro-Decimal ("13,90" | "13.90") -> Integer-Cent. Wirft bei Unfug. */
export function eurosToCents(input: string): number {
  const norm = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(norm)) {
    throw new Error(`Kein gueltiger Betrag: ${JSON.stringify(input)}`);
  }
  return Math.round(Number(norm) * 100);
}

/** Cent -> "12,34" (ohne Symbol, deutsches Dezimalkomma). */
export function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Cent -> "12,34 €". */
export function formatCents(cents: number): string {
  return `${formatEuros(cents)} €`;
}

/**
 * Bruttolohn in Cent: `minutes * rateCents / 60`, EINE Rundung am Ende.
 * `rateCents` ist der Stundensatz in Cent. Niemals ueber Dezimalstunden rechnen.
 */
export function grossPay(minutes: number, rateCents: number): number {
  return Math.round((minutes * rateCents) / 60);
}
