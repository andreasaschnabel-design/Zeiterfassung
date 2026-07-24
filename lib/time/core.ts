// DE-03: Alle Dauern intern in Minuten (Integer). Dezimalstunden nur an der
// Oberflaeche. Diese Datei ist reine, testbare Logik ohne Seiteneffekte.

export const HHMM_RE = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;

/** Prueft "HH:MM" im 24-Stunden-Format. "99:99" ist regexkonform NICHT gueltig. */
export function isValidHHMM(value: string): boolean {
  return HHMM_RE.test(value);
}

/**
 * "HH:MM" -> Minuten seit Mitternacht.
 *
 * US-02 (Kritisch): laut scheitern statt still NaN. Ein NaN-Vergleich liefert
 * immer false — die Ueberschneidungspruefung faende sonst schweigend nichts.
 */
export function parseHHMM(value: string): number {
  const m = HHMM_RE.exec(value);
  if (!m) throw new Error(`Ungueltige Uhrzeit: ${JSON.stringify(value)}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Brutto-Arbeitszeit in Minuten (Ende - Beginn), ohne Pausenabzug. */
export function grossMinutes(startTime: string, endTime: string): number {
  return parseHHMM(endTime) - parseHHMM(startTime);
}

/**
 * AK-2 / DE-01: Dauer = (Ende - Beginn) - Pause, in Minuten.
 * Einzige Quelle fuer `durationMinutes` (architecture.md, zentrale Funktionen).
 * Setzt gueltige, bereits gepruefte Eingaben voraus (siehe Zod-Schema).
 */
export function calculateDuration(params: {
  startTime: string;
  endTime: string;
  breakMinutes: number;
}): number {
  return grossMinutes(params.startTime, params.endTime) - params.breakMinutes;
}

/** Minuten -> "H:MM" fuer die Oberflaeche. */
export function formatMinutes(total: number): string {
  const sign = total < 0 ? "-" : "";
  const abs = Math.abs(total);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, "0")}`;
}

/**
 * US-02 (Kritisch): ArbZG-Hinweise als WARNUNG, nicht als Ablehnung.
 * §4: 30 Min Pause ab >6 Std, 45 Min ab >9 Std. §3: Hinweis ab >10 Std.
 * Grundlage ist die Netto-Arbeitszeit (durationMinutes).
 */
export function arbeitszeitHinweise(
  durationMinutes: number,
  breakMinutes: number,
): string[] {
  const hints: string[] = [];

  if (durationMinutes > 9 * 60 && breakMinutes < 45) {
    hints.push(
      "Ab 9 Stunden Arbeitszeit sind 45 Minuten Pause vorgesehen (§4 ArbZG).",
    );
  } else if (durationMinutes > 6 * 60 && breakMinutes < 30) {
    hints.push(
      "Ab 6 Stunden Arbeitszeit sind 30 Minuten Pause vorgesehen (§4 ArbZG).",
    );
  }

  if (durationMinutes > 10 * 60) {
    hints.push("Mehr als 10 Stunden Arbeitszeit an einem Tag (§3 ArbZG).");
  }

  return hints;
}
