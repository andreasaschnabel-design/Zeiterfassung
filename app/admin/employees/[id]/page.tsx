import Link from "next/link";
import { requireEmployeeTarget } from "@/lib/auth/guard";
import { getSettings } from "@/lib/queries/settings";
import { getMonth } from "@/lib/queries/month";
import { wageWarnings } from "@/lib/employees/warnings";
import { formatDecimalHours, formatMinutes } from "@/lib/time/core";
import { shiftMonth, todayISO } from "@/lib/time/dates";
import { evaluateLimit } from "@/lib/time/limit";
import { setEmployeeActive } from "../actions";
import { EditEmployeeForm } from "./edit-form";
import { AdminCreateEntryForm } from "./admin-create-entry-form";
import { ResetPasswordForm } from "./reset-password-form";

// US-10 (Stammdaten) + US-07 (Korrektur): Detail + Monatsansicht je Mitarbeiter.
export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const employee = await requireEmployeeTarget(id);
  const settings = await getSettings();

  const hourlyRate = Number(employee.hourlyRate).toFixed(2);
  const monthlyLimitHours = String(Number(employee.monthlyLimitHours));

  const warnings = wageWarnings({
    hourlyRate,
    monthlyLimitHours: Number(employee.monthlyLimitHours),
    minimumWage: settings.minimumWage,
    earningsLimit: settings.earningsLimit,
  });

  // US-07: Monatsansicht. Kein Monats-Cap fuer die Navigation nach vorn nur bis
  // zum aktuellen Monat; nach hinten frei (der Admin sieht die ganze Historie).
  const today = todayISO();
  const currentMonth = today.slice(0, 7);
  const sp = await searchParams;
  let ym = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonth;
  if (ym > currentMonth) ym = currentMonth;

  const { entries, totalMinutes } = await getMonth(employee.id, ym);
  const limitMinutes = Math.round(Number(employee.monthlyLimitHours) * 60);
  const limit = evaluateLimit(totalMinutes, limitMinutes);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/employees" className="text-sm text-blue-700 underline">
          ← Zur Mitarbeiterliste
        </Link>
        <Link href="/admin/overview" className="text-sm text-blue-700 underline">
          Monatsuebersicht
        </Link>
      </div>

      <h1 className="text-2xl font-semibold">{employee.name}</h1>
      <p className="mt-1 text-gray-600">
        Status: {employee.isActive ? "aktiv" : "inaktiv"}
      </p>

      {warnings.length > 0 ? (
        <div role="status"
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-1 font-medium">Hinweise</p>
          <ul className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* US-07: Monatsansicht + Korrektur */}
      <section className="mt-10 border-t pt-6">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/admin/employees/${employee.id}?month=${shiftMonth(ym, -1)}`}
            className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            ← Vormonat
          </Link>
          <h2 className="text-lg font-semibold">{ym}</h2>
          {ym < currentMonth ? (
            <Link
              href={`/admin/employees/${employee.id}?month=${shiftMonth(ym, 1)}`}
              className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              Folgemonat →
            </Link>
          ) : (
            <span aria-disabled="true"
              className="min-h-11 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-300">
              Folgemonat →
            </span>
          )}
        </div>

        <p className="mb-4 text-sm">
          Summe: <span className="font-semibold">{formatDecimalHours(totalMinutes)} Std</span>{" "}
          von {formatDecimalHours(limitMinutes)} Std ({Math.round(limit.percent)} %)
        </p>

        {entries.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-300 p-6 text-gray-600">
            Keine Zeiten in diesem Monat erfasst.
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
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="py-2 pr-4">
                      {e.workDate}
                      {!e.selfRecorded ? (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                          vom Admin
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4">{e.startTime}</td>
                    <td className="py-2 pr-4">{e.endTime}</td>
                    <td className="py-2 pr-4">{e.breakMinutes} min</td>
                    <td className="py-2 pr-4">{formatMinutes(e.durationMinutes)}</td>
                    <td className="py-2">
                      <Link href={`/admin/entries/${e.id}`}
                        className="text-blue-700 underline">
                        Korrigieren
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8">
          <h3 className="mb-3 text-base font-semibold">Zeit fuer diesen Mitarbeiter erfassen</h3>
          <AdminCreateEntryForm userId={employee.id} today={today} />
        </div>
      </section>

      {/* US-10: Stammdaten */}
      <section className="mt-10 border-t pt-6">
        <h2 className="mb-3 text-lg font-semibold">Stammdaten</h2>
        <EditEmployeeForm
          employee={{
            id: employee.id,
            name: employee.name,
            email: employee.email,
            hourlyRate,
            monthlyLimitHours,
          }}
        />
      </section>

      {/* US-12: Passwort zuruecksetzen */}
      <section className="mt-10 border-t pt-6">
        <h2 className="mb-3 text-lg font-semibold">Passwort zuruecksetzen</h2>
        <p className="mb-4 text-sm text-gray-600">
          Setzt ein neues Passwort und beendet alle bestehenden Sitzungen des
          Mitarbeiters. Das Passwort wird nur einmal angezeigt.
        </p>
        <ResetPasswordForm userId={employee.id} />
      </section>

      <section className="mt-10 border-t pt-6">
        <h2 className="mb-2 text-lg font-semibold">
          {employee.isActive ? "Deaktivieren" : "Aktivieren"}
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          {employee.isActive
            ? "Deaktivierte Mitarbeiter koennen sich nicht anmelden. Zeiteintraege bleiben erhalten."
            : "Aktiviert den Zugang wieder."}
        </p>
        <form action={setEmployeeActive}>
          <input type="hidden" name="id" value={employee.id} />
          <input type="hidden" name="active" value={employee.isActive ? "false" : "true"} />
          <button type="submit"
            className="min-h-12 rounded-md border border-gray-300 px-4 text-base font-medium">
            {employee.isActive ? "Mitarbeiter deaktivieren" : "Mitarbeiter aktivieren"}
          </button>
        </form>
      </section>
    </main>
  );
}
