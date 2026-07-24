import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { getSettings } from "@/lib/queries/settings";
import { getYear, summarizeYear } from "@/lib/queries/year";
import { eurosToCents } from "@/lib/money";
import { todayISO } from "@/lib/time/dates";
import { YearSummaryView } from "@/components/year-summary";

// US-14: Jahressumme (Mitarbeiter). AK-7: die Monatsansicht (US-05) bleibt
// unveraendert — dies ist eine zusaetzliche Ansicht.
export default async function YearPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser(); // AK-6

  if (user.role !== "EMPLOYEE") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p>
          <Link href="/admin" className="text-blue-700 underline">
            Zum Adminbereich
          </Link>
        </p>
      </main>
    );
  }

  const currentYear = Number(todayISO().slice(0, 4));
  const minYear = Number(todayISO(user.createdAt).slice(0, 4));
  const sp = await searchParams;
  let year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : currentYear;
  if (year > currentYear) year = currentYear;
  if (year < minYear) year = minYear;

  const settings = await getSettings();
  const rateCents = eurosToCents(user.hourlyRate.toString());
  const monthlyLimitCents = eurosToCents(settings.earningsLimit);
  const summary = summarizeYear(
    await getYear(user.id, year),
    rateCents,
    monthlyLimitCents,
  );

  const accountCreatedHint =
    minYear === year
      ? `Konto wurde im ${new Intl.DateTimeFormat("de-DE", {
          timeZone: "Europe/Berlin",
          month: "long",
          year: "numeric",
        }).format(user.createdAt)} angelegt.`
      : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold">Jahresuebersicht</h1>
        <Link href="/dashboard" className="text-sm text-blue-700 underline">
          Zur Monatsansicht
        </Link>
      </div>
      <YearSummaryView
        summary={summary}
        year={year}
        minYear={minYear}
        maxYear={currentYear}
        basePath="/dashboard/year"
        accountCreatedHint={accountCreatedHint}
      />
    </main>
  );
}
