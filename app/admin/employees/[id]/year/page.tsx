import Link from "next/link";
import { requireEmployeeTarget } from "@/lib/auth/guard";
import { getSettings } from "@/lib/queries/settings";
import { getYear, summarizeYear } from "@/lib/queries/year";
import { eurosToCents } from "@/lib/money";
import { todayISO } from "@/lib/time/dates";
import { YearSummaryView } from "@/components/year-summary";

// US-14/AK-5: Admin sieht dieselbe Jahresansicht je Mitarbeiter (AK-6 Schutz
// via requireEmployeeTarget).
export default async function AdminYearPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { id } = await params;
  const employee = await requireEmployeeTarget(id);

  const currentYear = Number(todayISO().slice(0, 4));
  const minYear = Number(todayISO(employee.createdAt).slice(0, 4));
  const sp = await searchParams;
  let year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : currentYear;
  if (year > currentYear) year = currentYear;
  if (year < minYear) year = minYear;

  const settings = await getSettings();
  const rateCents = eurosToCents(employee.hourlyRate.toString());
  const monthlyLimitCents = eurosToCents(settings.earningsLimit);
  const summary = summarizeYear(
    await getYear(employee.id, year),
    rateCents,
    monthlyLimitCents,
  );

  const accountCreatedHint =
    minYear === year
      ? `Konto wurde im ${new Intl.DateTimeFormat("de-DE", {
          timeZone: "Europe/Berlin",
          month: "long",
          year: "numeric",
        }).format(employee.createdAt)} angelegt.`
      : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jahresuebersicht — {employee.name}</h1>
        <Link
          href={`/admin/employees/${employee.id}`}
          className="text-sm text-blue-700 underline"
        >
          Zurueck
        </Link>
      </div>
      <YearSummaryView
        summary={summary}
        year={year}
        minYear={minYear}
        maxYear={currentYear}
        basePath={`/admin/employees/${employee.id}/year`}
        accountCreatedHint={accountCreatedHint}
      />
    </main>
  );
}
