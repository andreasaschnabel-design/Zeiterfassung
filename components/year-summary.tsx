import Link from "next/link";
import { formatDecimalHours } from "@/lib/time/core";
import { formatCents } from "@/lib/money";
import { evaluateCentsLimit, type LimitStatus } from "@/lib/time/limit";
import type { YearSummary } from "@/lib/queries/year";

const BAR_COLOR: Record<LimitStatus, string> = {
  OK: "bg-green-600",
  WARNING: "bg-amber-500",
  EXCEEDED: "bg-red-600",
};
const STATUS_TEXT: Record<LimitStatus, string | null> = {
  OK: null,
  WARNING: "Jahresgrenze bald erreicht (ab 90 %).",
  EXCEEDED: "Jahresgrenze erreicht oder ueberschritten.",
};
const MONTH_LABELS = [
  "Jan", "Feb", "Mrz", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

export function YearSummaryView({
  summary,
  year,
  minYear,
  maxYear,
  basePath,
  accountCreatedHint,
}: {
  summary: YearSummary;
  year: number;
  minYear: number;
  maxYear: number;
  basePath: string;
  accountCreatedHint: string | null;
}) {
  const limit = evaluateCentsLimit(summary.totalGrossCents, summary.yearLimitCents);
  const displayPercent = Math.round(limit.percent);
  const monthlyLimitCents = Math.round(summary.yearLimitCents / 12);
  const statusText = STATUS_TEXT[limit.status];

  const hasPrev = year > minYear;
  const hasNext = year < maxYear;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        {hasPrev ? (
          <Link href={`${basePath}?year=${year - 1}`}
            className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm">
            ← {year - 1}
          </Link>
        ) : (
          <span aria-disabled="true"
            className="min-h-11 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-300">
            ← {year - 1}
          </span>
        )}
        <h2 className="text-lg font-semibold">Jahr {year}</h2>
        {hasNext ? (
          <Link href={`${basePath}?year=${year + 1}`}
            className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm">
            {year + 1} →
          </Link>
        ) : (
          <span aria-disabled="true"
            className="min-h-11 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-300">
            {year + 1} →
          </span>
        )}
      </div>

      {/* AK-1 + AK-2: Jahressumme in Stunden und Euro, gegen 12 x Grenze. */}
      <p className="mb-1 text-sm">
        <span className="font-semibold">
          {formatDecimalHours(summary.totalMinutes)} Std
        </span>{" "}
        · <span className="font-semibold">{formatCents(summary.totalGrossCents)}</span>{" "}
        von {formatCents(summary.yearLimitCents)} ({displayPercent} %)
      </p>
      <div
        role="progressbar"
        aria-valuenow={Math.min(100, displayPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${formatCents(summary.totalGrossCents)} von ${formatCents(summary.yearLimitCents)}, ${displayPercent} Prozent`}
        className="h-3 w-full overflow-hidden rounded-full bg-gray-200"
      >
        <div className={`h-full ${BAR_COLOR[limit.status]}`}
          style={{ width: `${limit.barPercent}%` }} />
      </div>
      {statusText ? (
        <p className={`mt-2 text-sm font-medium ${
          limit.status === "EXCEEDED" ? "text-red-700" : "text-amber-800"
        }`}>
          {statusText}
        </p>
      ) : null}

      {/* Rundungsdifferenz erklaeren, wenn ungleich 0 (Kritisch). */}
      {summary.roundingDiffCents !== 0 ? (
        <p className="mt-2 text-xs text-gray-500">
          Die Summe der angezeigten Monatsbetraege weicht um{" "}
          {formatCents(Math.abs(summary.roundingDiffCents))} vom Jahresbetrag ab
          — der Jahresbetrag wird genauer aus den Minuten gerechnet (eine Rundung).
        </p>
      ) : null}

      {/* AK-4: Monatsverteilung, zwoelf Buckets. */}
      <div className="mt-6 space-y-1">
        {summary.months.map((m, i) => {
          const mEval = evaluateCentsLimit(m.grossCents, monthlyLimitCents);
          return (
            <div key={m.ym} className="flex items-center gap-3 text-sm">
              <span className="w-10 text-gray-500">{MONTH_LABELS[i]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                <div className={`h-full ${BAR_COLOR[mEval.status]}`}
                  style={{ width: `${mEval.barPercent}%` }} />
              </div>
              <span className="w-20 text-right tabular-nums">
                {formatDecimalHours(m.minutes)} Std
              </span>
              <span className="w-24 text-right tabular-nums">
                {formatCents(m.grossCents)}
              </span>
            </div>
          );
        })}
      </div>

      {summary.monthsOverLimit > 0 ? (
        <p className="mt-4 text-sm text-gray-600">
          In {summary.monthsOverLimit}{" "}
          {summary.monthsOverLimit === 1 ? "Monat" : "Monaten"} lag der Betrag
          ueber der Monatsgrenze (nur nachrichtlich).
        </p>
      ) : null}

      {/* Kalenderjahr statt Zeitjahr — Hinweis. */}
      <p className="mt-6 text-xs text-gray-500">
        Angezeigt wird das Kalenderjahr. Die Entgeltgrenze gilt im rollierenden
        Zeitjahr ab Beschaeftigungsbeginn — dieser ist dem System nicht bekannt.
      </p>
      {accountCreatedHint ? (
        <p className="mt-1 text-xs text-gray-500">{accountCreatedHint}</p>
      ) : null}
    </div>
  );
}
