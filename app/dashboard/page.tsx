import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { formatDecimalHours, formatMinutes } from "@/lib/time/core";
import { shiftMonth, todayISO } from "@/lib/time/dates";
import { getMonth } from "@/lib/queries/month";
import { evaluateLimit, type LimitStatus } from "@/lib/time/limit";
import { logout } from "../(auth)/login/actions";
import { EntryForm } from "./entry-form";

const BAR_COLOR: Record<LimitStatus, string> = {
  OK: "bg-green-600",
  WARNING: "bg-amber-500",
  EXCEEDED: "bg-red-600",
};

const STATUS_TEXT: Record<LimitStatus, string | null> = {
  OK: null,
  WARNING: "Monatslimit bald erreicht (ab 90 %).",
  EXCEEDED: "Monatslimit erreicht oder ueberschritten.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();

  // Admins haben keinen Erfassungsbereich (DB-Trigger verbietet Admin-Eintraege).
  if (user.role !== "EMPLOYEE") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Angemeldet als {user.name}</h1>
        <p className="mt-2">
          <Link href="/admin" className="text-blue-700 underline">
            Zum Adminbereich
          </Link>
        </p>
        <form action={logout} className="mt-8">
          <button className="min-h-12 rounded-md border border-gray-300 px-4 text-base font-medium">
            Abmelden
          </button>
        </form>
      </main>
    );
  }

  const today = todayISO();
  const currentMonth = today.slice(0, 7);
  const minMonth = todayISO(user.createdAt).slice(0, 7); // rueckwaerts bis Kontoanlage

  // AK-5 (Kritisch): Bereichspruefung auch fuer den URL-Parameter, nicht nur
  // fuer die Pfeile. Ungueltiges/ausserhalb -> auf den zulaessigen Bereich klemmen.
  const sp = await searchParams;
  let ym = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonth;
  if (ym > currentMonth) ym = currentMonth;
  if (ym < minMonth) ym = minMonth;

  const { entries, totalMinutes } = await getMonth(user.id, ym);
  const limitMinutes = Math.round(Number(user.monthlyLimitHours) * 60);
  const limit = evaluateLimit(totalMinutes, limitMinutes);
  const displayPercent = Math.round(limit.percent);

  const hasPrev = ym > minMonth;
  const hasNext = ym < currentMonth;
  const statusText = STATUS_TEXT[limit.status];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold">Zeiterfassung</h1>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/year" className="text-sm text-blue-700 underline">
            Jahresuebersicht
          </Link>
          <form action={logout}>
            <button className="text-sm text-gray-600 underline">Abmelden</button>
          </form>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Neue Zeit erfassen</h2>
        <EntryForm today={today} />
      </section>

      <section>
        {/* AK-5: Navigation — Pfeile deaktivieren, nicht verstecken. */}
        <div className="mb-4 flex items-center justify-between">
          {hasPrev ? (
            <Link
              href={`/dashboard?month=${shiftMonth(ym, -1)}`}
              className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              ← Vormonat
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="min-h-11 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-300"
            >
              ← Vormonat
            </span>
          )}

          <h2 className="text-lg font-semibold">{ym}</h2>

          {hasNext ? (
            <Link
              href={`/dashboard?month=${shiftMonth(ym, 1)}`}
              className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              Folgemonat →
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="min-h-11 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-300"
            >
              Folgemonat →
            </span>
          )}
        </div>

        {/* AK-2 + AK-3 + AK-4: Summe, Fortschritt, Ampel */}
        <div className="mb-6">
          <p className="mb-1 text-sm">
            <span className="font-semibold">
              {formatDecimalHours(totalMinutes)} Std
            </span>{" "}
            von {formatDecimalHours(limitMinutes)} Std ({displayPercent} %)
          </p>
          <div
            role="progressbar"
            aria-valuenow={Math.min(100, displayPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${formatDecimalHours(totalMinutes)} von ${formatDecimalHours(limitMinutes)} Stunden, ${displayPercent} Prozent`}
            className="h-3 w-full overflow-hidden rounded-full bg-gray-200"
          >
            <div
              className={`h-full ${BAR_COLOR[limit.status]}`}
              style={{ width: `${limit.barPercent}%` }}
            />
          </div>
          {/* Farbe traegt die Information nicht allein: Statustext sichtbar. */}
          {statusText ? (
            <p
              className={`mt-2 text-sm font-medium ${
                limit.status === "EXCEEDED" ? "text-red-700" : "text-amber-800"
              }`}
            >
              {statusText}
            </p>
          ) : null}
        </div>

        {entries.length === 0 ? (
          // AK-7: Leerzustand kontextabhaengig.
          <p className="rounded-md border border-dashed border-gray-300 p-6 text-gray-600">
            {ym === currentMonth
              ? "Noch keine Zeiten in diesem Monat — erfasse deine erste Zeit oben."
              : "Keine Zeiten in diesem Monat erfasst."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 pr-4">Datum</th>
                  <th className="py-2 pr-4">Beginn</th>
                  <th className="py-2 pr-4">Ende</th>
                  <th className="py-2 pr-4">Pause</th>
                  <th className="py-2 pr-4">Dauer</th>
                  <th className="py-2 pr-4">Notiz</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="py-2 pr-4">{e.workDate}</td>
                    <td className="py-2 pr-4">{e.startTime}</td>
                    <td className="py-2 pr-4">{e.endTime}</td>
                    <td className="py-2 pr-4">{e.breakMinutes} min</td>
                    <td className="py-2 pr-4">{formatMinutes(e.durationMinutes)}</td>
                    <td className="py-2 pr-4 text-gray-600">{e.note ?? ""}</td>
                    <td className="py-2">
                      <Link
                        href={`/dashboard/entries/${e.id}`}
                        className="text-blue-700 underline"
                      >
                        Bearbeiten
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
