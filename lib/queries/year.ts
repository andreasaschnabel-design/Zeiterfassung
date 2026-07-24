import { prisma } from "@/lib/prisma";
import { grossPay } from "@/lib/money";

// US-14: Jahressumme. getYear() liefert die reinen Minuten-Buckets (zwoelf,
// auch leere); summarizeYear() macht daraus die Geldwerte.

export type YearData = {
  year: number;
  months: { ym: string; minutes: number }[]; // immer 12
  totalMinutes: number;
};

/** Eine Abfrage ueber das ganze Jahr; Bucketing nach Monat in JS. */
export async function getYear(userId: string, year: number): Promise<YearData> {
  const gte = new Date(Date.UTC(year, 0, 1));
  const lt = new Date(Date.UTC(year + 1, 0, 1));

  const rows = await prisma.timeEntry.findMany({
    where: { userId, workDate: { gte, lt } },
    select: { workDate: true, durationMinutes: true },
  });

  // Zwoelf Buckets, auch leere. Zukuenftige Monate bleiben 0 (nicht ausblenden).
  const months = Array.from({ length: 12 }, (_, i) => ({
    ym: `${year}-${String(i + 1).padStart(2, "0")}`,
    minutes: 0,
  }));

  let totalMinutes = 0;
  for (const r of rows) {
    months[r.workDate.getUTCMonth()].minutes += r.durationMinutes;
    totalMinutes += r.durationMinutes;
  }

  return { year, months, totalMinutes };
}

export type YearSummary = {
  months: {
    ym: string;
    minutes: number;
    grossCents: number; // gerundeter Monatsbetrag (Anzeigewert)
    overLimit: boolean;
  }[];
  totalMinutes: number;
  /** Jahresbetrag AUS MINUTEN, eine Rundung — massgeblich fuer die Ampel. */
  totalGrossCents: number;
  /** Summe der gerundeten Monatsbetraege (Anzeige) — kann abweichen. */
  monthlySumCents: number;
  /** monthlySum - totalGross; != 0 wird im UI erklaert. */
  roundingDiffCents: number;
  yearLimitCents: number;
  /** Nur nachrichtlich — KEINE Zwei-Monats-Regel-Auswertung. */
  monthsOverLimit: number;
};

/**
 * US-14 (Kritisch): Der Jahresbetrag wird AUS DEN MINUTEN gerechnet
 * (`grossPay(totalMinutes, rate)`), nicht als Summe der zwoelf gerundeten
 * Monatsbetraege — zwoelf Rundungen weichen um bis zu 6 Cent ab und die Ampel
 * kippt am Grenzwert je nach Rechenweg. Die Monatsbetraege bleiben gerundet
 * (Anzeigewerte); die Differenz wird ausgewiesen, wenn sie ungleich 0 ist.
 */
export function summarizeYear(
  data: YearData,
  rateCents: number,
  monthlyLimitCents: number,
): YearSummary {
  const months = data.months.map((m) => {
    const grossCents = grossPay(m.minutes, rateCents);
    return {
      ym: m.ym,
      minutes: m.minutes,
      grossCents,
      overLimit: grossCents > monthlyLimitCents,
    };
  });

  const totalGrossCents = grossPay(data.totalMinutes, rateCents);
  const monthlySumCents = months.reduce((s, m) => s + m.grossCents, 0);

  return {
    months,
    totalMinutes: data.totalMinutes,
    totalGrossCents,
    monthlySumCents,
    roundingDiffCents: monthlySumCents - totalGrossCents,
    yearLimitCents: 12 * monthlyLimitCents,
    monthsOverLimit: months.filter((m) => m.overLimit).length,
  };
}
