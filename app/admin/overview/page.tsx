import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { formatDecimalHours } from "@/lib/time/core";
import { shiftMonth, todayISO } from "@/lib/time/dates";
import { getAdminMonthOverview } from "@/lib/queries/admin-month";
import { evaluateLimit, type LimitStatus } from "@/lib/time/limit";

const STATUS_LABEL: Record<LimitStatus, string> = {
  OK: "im Rahmen",
  WARNING: "nahe Limit",
  EXCEEDED: "ueber Limit",
};
const STATUS_CLASS: Record<LimitStatus, string> = {
  OK: "text-green-700",
  WARNING: "text-amber-800",
  EXCEEDED: "text-red-700",
};

// US-06: Admin-Dashboard — alle Mitarbeiter mit Monatsstunden.
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin(); // AK-6

  const currentMonth = todayISO().slice(0, 7);
  const sp = await searchParams;
  let ym = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonth;
  if (ym > currentMonth) ym = currentMonth;

  const { rows, employeeCount, minMonth } = await getAdminMonthOverview(ym);
  const hasPrev = ym > minMonth;
  const hasNext = ym < currentMonth;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Monatsuebersicht</h1>
        <Link href="/admin" className="text-sm text-blue-700 underline">
          Zum Adminbereich
        </Link>
      </div>

      {/* AK-3: Monatsnavigation, Pfeile deaktivieren statt verstecken. */}
      <div className="mb-6 flex items-center justify-between">
        {hasPrev ? (
          <Link href={`/admin/overview?month=${shiftMonth(ym, -1)}`}
            className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm">
            ← Vormonat
          </Link>
        ) : (
          <span aria-disabled="true"
            className="min-h-11 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-300">
            ← Vormonat
          </span>
        )}
        <h2 className="text-lg font-semibold">{ym}</h2>
        {hasNext ? (
          <Link href={`/admin/overview?month=${shiftMonth(ym, 1)}`}
            className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm">
            Folgemonat →
          </Link>
        ) : (
          <span aria-disabled="true"
            className="min-h-11 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-300">
            Folgemonat →
          </span>
        )}
      </div>

      {employeeCount === 0 ? (
        // Leerzustand: keine Mitarbeiter angelegt (mit Link zum Anlegen).
        <p className="rounded-md border border-dashed border-gray-300 p-6 text-gray-600">
          Noch keine Mitarbeiter angelegt.{" "}
          <Link href="/admin/employees" className="text-blue-700 underline">
            Jetzt anlegen
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2 pr-4">Mitarbeiter</th>
                <th className="py-2 pr-4">Stunden</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Eintraege</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const limit = evaluateLimit(
                  r.totalMinutes,
                  Math.round(r.monthlyLimitHours * 60),
                );
                return (
                  <tr key={r.userId} className="border-b">
                    <td className="py-2 pr-4">
                      <span className="font-medium">{r.name}</span>
                      {!r.isActive ? (
                        <span className="ml-2 text-xs text-gray-500">(inaktiv)</span>
                      ) : null}
                      {r.adminEdited ? (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                          admin-bearbeitet
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4">
                      {formatDecimalHours(r.totalMinutes)} /{" "}
                      {formatDecimalHours(Math.round(r.monthlyLimitHours * 60))}
                    </td>
                    <td className={`py-2 pr-4 ${STATUS_CLASS[limit.status]}`}>
                      {STATUS_LABEL[limit.status]}
                    </td>
                    <td className="py-2 pr-4">{r.entryCount}</td>
                    <td className="py-2">
                      {/* AK-4: Absprung in die Detailansicht */}
                      <Link
                        href={`/admin/employees/${r.userId}?month=${ym}`}
                        className="text-blue-700 underline"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
