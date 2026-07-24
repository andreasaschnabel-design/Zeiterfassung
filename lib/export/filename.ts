// US-08 (Kritisch): Transliteration VOR der NFD-Zerlegung.
//
// `ß` ist kein Kombinationszeichen — NFD zerlegt es NICHT. Wuerde man erst
// NFD-zerlegen und dann Nicht-ASCII filtern, verschwaende `ß` ersatzlos und
// "Weiß" wuerde zu "Wei". Ebenso muss `ä` zu "ae" werden, nicht zu "a".
// Fallback "Unbekannt", falls nach der Filterung nichts uebrig bleibt.

const TRANSLITERATION: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
  ß: "ss",
};

/** Ein Namensbestandteil, sicher fuer Dateinamen (ASCII, `_` als Trenner). */
export function safeFileNamePart(input: string): string {
  // 1. Deutsche Sonderzeichen ZUERST transliterieren.
  let s = input.replace(/[äöüÄÖÜß]/g, (c) => TRANSLITERATION[c] ?? c);
  // 2. Dann NFD fuer restliche Akzente (é -> e, ç -> c ...).
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  // 3. Alles Nicht-Alphanumerische zu `_`, Raender trimmen.
  s = s.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return s || "Unbekannt";
}

/** z. B. "Zeitnachweis_Anna_Weiss_2026-07.pdf". */
export function exportFileName(
  name: string,
  ym: string,
  ext: "pdf" | "csv",
): string {
  return `Zeitnachweis_${safeFileNamePart(name)}_${ym}.${ext}`;
}

/** Sammel-Export ueber alle Mitarbeiter. */
export function collectiveFileName(ym: string, ext: "pdf" | "csv"): string {
  return `Zeitnachweise_alle_${ym}.${ext}`;
}
