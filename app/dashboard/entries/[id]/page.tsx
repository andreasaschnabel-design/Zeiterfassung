import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnEditableEntry } from "@/lib/auth/guard";
import { dbDateToIso, berlinTimestamp } from "@/lib/time/dates";
import { formatMinutes } from "@/lib/time/core";
import { actionLabel, buildChanges } from "@/lib/audit/changes";
import { getForeignChanges } from "@/lib/queries/history";
import { EditEntryForm } from "./edit-entry-form";

// US-04: Eigenen Eintrag korrigieren. Editierbar → Formular; gesperrt (zu alt)
// → schreibgeschuetzte Ansicht mit Meldung (AK-2). Fremd/unbekannt → notFound().
export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await requireOwnEditableEntry(id);

  if (!result.ok && result.reason === "not_found") notFound();
  // Ab hier: ok:true (editierbar) ODER locked — beide tragen `entry`.
  const entry = result.entry;
  const workDate = dbDateToIso(entry.workDate);

  // US-11 (Kritisch): Fremdaenderungen an eigenen Eintraegen (changedById != user).
  // entry.userId ist der angemeldete Nutzer (vom Guard geprueft).
  const foreignChanges = await getForeignChanges(entry.id, entry.userId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/dashboard?month=${workDate.slice(0, 7)}`}
          className="text-sm text-blue-700 underline"
        >
          ← Zur Monatsuebersicht
        </Link>
      </div>

      <h1 className="text-2xl font-semibold">Eintrag {workDate}</h1>

      {result.ok ? (
        <div className="mt-6">
          <EditEntryForm
            entry={{
              id: entry.id,
              workDate,
              startTime: entry.startTime,
              endTime: entry.endTime,
              breakMinutes: entry.breakMinutes,
              note: entry.note,
            }}
          />
        </div>
      ) : (
        <div className="mt-6">
          <div
            role="status"
            className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
          >
            {result.message}
          </div>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
            <dt className="text-gray-500">Beginn</dt>
            <dd>{entry.startTime}</dd>
            <dt className="text-gray-500">Ende</dt>
            <dd>{entry.endTime}</dd>
            <dt className="text-gray-500">Pause</dt>
            <dd>{entry.breakMinutes} min</dd>
            <dt className="text-gray-500">Dauer</dt>
            <dd>{formatMinutes(entry.durationMinutes)} Std</dd>
            <dt className="text-gray-500">Notiz</dt>
            <dd>{entry.note ?? "—"}</dd>
          </dl>
        </div>
      )}

      {foreignChanges.length > 0 ? (
        <section className="mt-10 border-t pt-6">
          <h2 className="mb-3 text-lg font-semibold">Aenderungen durch die Verwaltung</h2>
          <ol className="space-y-4">
            {foreignChanges.map((log) => {
              const changes = buildChanges(log.action, log.oldValues, log.newValues);
              return (
                <li key={log.id} className="rounded-md border border-gray-200 p-4">
                  <p className="mb-2 text-sm text-gray-600">
                    {actionLabel(log.action)} · {berlinTimestamp(log.changedAt)}
                  </p>
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
        </section>
      ) : null}
    </main>
  );
}
