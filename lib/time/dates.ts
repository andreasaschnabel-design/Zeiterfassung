// DE-02: `workDate` ist ein reines Datum ohne Zeitzone. Arbeitszeiterfassung ist
// lokale Wanduhrzeit — UTC-Umrechnung erzeugt bei Sommerzeitwechseln nur Fehler.
//
// Kritisch: `new Date(isoString)` ist mehrdeutig ("2026-01-15" wird als UTC
// geparst, "2026-01-15T00:00" lokal) und speichert je nach Serverzeitzone den
// Vortag. Deshalb ausschliesslich die Funktionen hier verwenden.

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * "YYYY-MM-DD" -> Date bei UTC-Mitternacht dieses Kalendertags. Genau das
 * erwartet Prisma fuer `@db.Date`. Explizit ueber Date.UTC — kein `new Date(iso)`.
 */
export function isoDateToDbDate(iso: string): Date {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) throw new Error(`Ungueltiges Datum: ${JSON.stringify(iso)}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/**
 * Date aus einer `@db.Date`-Spalte (UTC-Mitternacht) -> "YYYY-MM-DD".
 * UTC-Getter, damit auf einem UTC-Server nicht der Vortag herausfaellt.
 */
export function dbDateToIso(date: Date): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

/**
 * Heutiges Datum in Europe/Berlin als "YYYY-MM-DD". Vercel laeuft in UTC —
 * jede Datumsbildung MUSS hierueber laufen (D6: Eintrag nach 22:00 deutscher
 * Zeit bekommt das heutige Datum, nicht den Vortag). `now` injizierbar fuer Tests.
 */
export function todayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "YYYY-MM-DD" um `days` verschoben (kann negativ sein). */
export function addDays(iso: string, days: number): string {
  const base = isoDateToDbDate(iso);
  base.setUTCDate(base.getUTCDate() + days);
  return dbDateToIso(base);
}

/**
 * Datumsregeln beim Anlegen (Mitarbeiter): AK-6 keine Zukunft, US-03 hoechstens
 * `maxBackdateDays` zurueck. Rein textueller ISO-Vergleich (YYYY-MM-DD sortiert
 * chronologisch). Gibt eine Meldung zurueck oder `null`, wenn zulaessig.
 */
export function workDateError(
  workDateISO: string,
  today: string,
  maxBackdateDays: number,
): string | null {
  if (!ISO_DATE_RE.test(workDateISO)) return "Ungueltiges Datum.";
  if (workDateISO > today) return "Ein Zukunftsdatum ist nicht erlaubt.";
  if (workDateISO < addDays(today, -maxBackdateDays)) {
    return `Der Eintrag liegt weiter als ${maxBackdateDays} Tage zurueck und kann nicht mehr nachgetragen werden.`;
  }
  return null;
}

const ISO_MONTH_RE = /^(\d{4})-(\d{2})$/;

/**
 * Halboffener Monatsbereich `[gte, lt)` fuer "YYYY-MM".
 * `Date.UTC(year, 12, 1)` rollt korrekt ins Folgejahr — kein Dezember-Sonderfall.
 */
export function monthRange(ym: string): { gte: Date; lt: Date } {
  const m = ISO_MONTH_RE.exec(ym);
  if (!m) throw new Error(`Ungueltiger Monat: ${JSON.stringify(ym)}`);
  const year = Number(m[1]);
  const month = Number(m[2]); // 1..12
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  };
}

/**
 * Verschiebt "YYYY-MM" um `delta` Monate. Ueber Date.UTC, damit der
 * Jahreswechsel korrekt ist (nicht `month - 1`). Auch von US-04 genutzt.
 */
export function shiftMonth(ym: string, delta: number): string {
  const m = ISO_MONTH_RE.exec(ym);
  if (!m) throw new Error(`Ungueltiger Monat: ${JSON.stringify(ym)}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
