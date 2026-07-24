import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnEditableEntry } from "@/lib/auth/guard";
import { dbDateToIso } from "@/lib/time/dates";
import { formatMinutes } from "@/lib/time/core";
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
    </main>
  );
}
