import { prisma } from "@/lib/prisma";

// US-10/AK-6: Globale Parameter. Schluessel siehe architecture.md.
export type Settings = {
  minimumWage: string; // Euro-Decimal, z. B. "13.90"
  earningsLimit: string; // Euro, z. B. "556"
  employerName: string; // Firmenname, ohne den kein Export (US-08)
};

export const SETTING_KEYS = [
  "minimumWage",
  "earningsLimit",
  "employerName",
] as const;

export const DEFAULT_SETTINGS: Settings = {
  minimumWage: "13.90",
  earningsLimit: "556",
  employerName: "",
};

/** Liest die globalen Parameter, mit Defaults fuer fehlende Schluessel. */
export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...SETTING_KEYS] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    minimumWage: map.minimumWage ?? DEFAULT_SETTINGS.minimumWage,
    earningsLimit: map.earningsLimit ?? DEFAULT_SETTINGS.earningsLimit,
    employerName: map.employerName ?? DEFAULT_SETTINGS.employerName,
  };
}

/**
 * Schreibt die uebergebenen Parameter (upsert je Schluessel, atomar).
 *
 * Beruehrt AUSSCHLIESSLICH die Setting-Tabelle. Eine Aenderung von
 * `minimumWage` wirkt damit NICHT rueckwirkend auf `User.hourlyRate`
 * (US-10, Kritisch).
 */
export async function updateSettings(values: Partial<Settings>): Promise<void> {
  const entries = Object.entries(values).filter(
    ([, v]) => typeof v === "string",
  ) as [string, string][];
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );
}
