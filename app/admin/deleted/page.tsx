import Link from "next/link";
import { berlinTimestamp } from "@/lib/time/dates";
import { getDeletedEntries } from "@/lib/queries/deleted";

// US-11/AK-4: Geloeschte Eintraege bleiben einsehbar. Liste ueber $queryRaw
// (getDeletedEntries ruft requireAdmin() selbst).
export default async function DeletedEntriesPage() {
  const deleted = await getDeletedEntries();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold">Geloeschte Eintraege</h1>
        <Link href="/admin" className="text-sm text-blue-700 underline">
          Zum Adminbereich
        </Link>
      </div>

      {deleted.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 p-6 text-gray-600">
          Keine geloeschten Eintraege.
        </p>
      ) : (
        <ul className="divide-y">
          {deleted.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-3 text-sm">
              <span>
                <span className="font-medium">{d.userName}</span>
                {" — Arbeitstag "}
                {d.workDate}
                <span className="ml-2 text-gray-500">
                  (geloescht {berlinTimestamp(d.deletedAt)})
                </span>
              </span>
              <Link
                href={`/admin/entries/${d.id}/history`}
                className="text-blue-700 underline"
              >
                Protokoll
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
