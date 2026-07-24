import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { dbDateToIso, berlinTimestamp } from "@/lib/time/dates";
import { actionLabel, buildChanges } from "@/lib/audit/changes";
import { getEntryHistory } from "@/lib/queries/history";

// US-11: Vollstaendiges Aenderungsprotokoll eines Eintrags. AK-5 requireAdmin().
export default async function EntryHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  // findUnique ist von der Soft-Delete-Middleware ausgenommen (DE-04) — deckt
  // AK-4 fuer geloeschte Eintraege ab.
  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!entry) notFound();

  const logs = await getEntryHistory(id);
  const workDate = dbDateToIso(entry.workDate);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/admin/employees/${entry.user.id}?month=${workDate.slice(0, 7)}`}
          className="text-sm text-blue-700 underline"
        >
          ← Zurueck zu {entry.user.name}
        </Link>
      </div>

      <h1 className="text-2xl font-semibold">Aenderungsprotokoll</h1>
      <p className="mt-1 text-gray-600">
        {entry.user.name} — Arbeitstag {workDate}
      </p>

      {entry.deletedAt ? (
        <div
          role="status"
          className="mt-4 rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-700"
        >
          Dieser Eintrag wurde geloescht ({berlinTimestamp(entry.deletedAt)}),
          bleibt aber einsehbar.
        </div>
      ) : null}

      <ol className="mt-6 space-y-6">
        {logs.map((log) => {
          const changes = buildChanges(log.action, log.oldValues, log.newValues);
          const isAdmin = log.changedBy.role === "ADMIN";
          return (
            <li key={log.id} className="rounded-md border border-gray-200 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{actionLabel(log.action)}</span>
                <span className="text-gray-500">{berlinTimestamp(log.changedAt)}</span>
                <span className="text-gray-700">durch {log.changedBy.name}</span>
                {/* AK-3: Rolle als Text-Badge (nicht nur Farbe, nicht Name). */}
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    isAdmin ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {isAdmin ? "Admin" : "Mitarbeiter"}
                </span>
              </div>

              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-1 pr-4">Feld</th>
                    <th className="py-1 pr-4">Vorher</th>
                    <th className="py-1">Nachher</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c) => (
                    <tr key={c.label} className="border-b last:border-0">
                      <td className="py-1 pr-4">{c.label}</td>
                      <td className="py-1 pr-4">{c.from ?? "—"}</td>
                      <td className="py-1">{c.to ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
