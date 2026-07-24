import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { formatMinutes } from "@/lib/time/core";
import { dbDateToIso, todayISO } from "@/lib/time/dates";
import { logout } from "../(auth)/login/actions";
import { EntryForm } from "./entry-form";

// Mitarbeiter-Landing: Eingabe + (vorlaeufige) Monatsliste.
// US-05 ergaenzt Monatssumme, Limit-Ampel und Monatsnavigation.
export default async function DashboardPage() {
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
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  // Halboffener Monatsbereich [gte, lt). Date.UTC(year, month, 1) rollt korrekt
  // ins Folgejahr (die kanonische monthRange() kommt mit US-05).
  const gte = new Date(Date.UTC(year, month - 1, 1));
  const lt = new Date(Date.UTC(year, month, 1));

  const entries = await prisma.timeEntry.findMany({
    where: { userId: user.id, workDate: { gte, lt } },
    orderBy: [{ workDate: "asc" }, { startTime: "asc" }],
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Zeiterfassung</h1>
        <form action={logout}>
          <button className="text-sm text-gray-600 underline">Abmelden</button>
        </form>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Neue Zeit erfassen</h2>
        <EntryForm today={today} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Dieser Monat ({today.slice(0, 7)})
        </h2>
        {entries.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-300 p-6 text-gray-600">
            Noch keine Zeiten in diesem Monat erfasst.
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
                  <th className="py-2">Notiz</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="py-2 pr-4">{dbDateToIso(e.workDate)}</td>
                    <td className="py-2 pr-4">{e.startTime}</td>
                    <td className="py-2 pr-4">{e.endTime}</td>
                    <td className="py-2 pr-4">{e.breakMinutes} min</td>
                    <td className="py-2 pr-4">{formatMinutes(e.durationMinutes)}</td>
                    <td className="py-2 text-gray-600">{e.note ?? ""}</td>
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
