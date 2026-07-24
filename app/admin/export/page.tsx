import Link from "next/link";
import { requireExportReady } from "@/lib/export/ready";
import { prisma } from "@/lib/prisma";
import { todayISO } from "@/lib/time/dates";

// US-08/US-09: Export-Uebersicht. employerName Pflicht — sonst Buttons aus und
// Link zu den Einstellungen (requireExportReady).
export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const ready = await requireExportReady(); // ruft requireAdmin()

  const currentMonth = todayISO().slice(0, 7);
  const sp = await searchParams;
  const month =
    sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonth;

  if (!ready.ready) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Export</h1>
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Der Export ist gesperrt, solange kein Firmenname gesetzt ist.{" "}
          <Link href="/admin/settings" className="underline">
            Zu den Einstellungen
          </Link>
          .
        </div>
      </main>
    );
  }

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold">Export</h1>
        <Link href="/admin" className="text-sm text-blue-700 underline">
          Zum Adminbereich
        </Link>
      </div>

      {/* Monatsauswahl */}
      <form method="get" className="mb-8 flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="month" className="text-sm font-medium">Monat</label>
          <input
            id="month"
            name="month"
            type="month"
            defaultValue={month}
            max={currentMonth}
            className="min-h-12 rounded-md border border-gray-300 px-3 text-base"
          />
        </div>
        <button
          type="submit"
          className="min-h-12 rounded-md border border-gray-300 px-4 text-base font-medium"
        >
          Monat waehlen
        </button>
      </form>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Sammel-Export ({month})</h2>
        <div className="flex gap-3">
          <a
            href={`/api/export/pdf/all/${month}`}
            className="min-h-12 rounded-md bg-gray-900 px-4 leading-[3rem] text-base font-medium text-white"
          >
            PDF (alle)
          </a>
          <a
            href={`/api/export/csv/${month}`}
            className="min-h-12 rounded-md border border-gray-300 px-4 leading-[3rem] text-base font-medium"
          >
            CSV (alle)
          </a>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Je Mitarbeiter ({month})</h2>
        {employees.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-300 p-6 text-gray-600">
            Noch keine Mitarbeiter angelegt.
          </p>
        ) : (
          <ul className="divide-y">
            {employees.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-3">
                <span>
                  {e.name}
                  {!e.isActive ? (
                    <span className="ml-2 text-xs text-gray-500">(inaktiv)</span>
                  ) : null}
                </span>
                <span className="flex gap-3 text-sm">
                  <a
                    href={`/api/export/pdf/${e.id}/${month}`}
                    className="text-blue-700 underline"
                  >
                    PDF
                  </a>
                  <a
                    href={`/api/export/csv/${month}?userId=${e.id}`}
                    className="text-blue-700 underline"
                  >
                    CSV
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
