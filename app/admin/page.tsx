import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { logout } from "../(auth)/login/actions";

// Admin-Einstiegshub. Die Monatsuebersicht (/admin/overview) folgt mit US-06.
export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Adminbereich</h1>
      <p className="mt-1 text-gray-600">Angemeldet als {user.name}</p>

      <nav className="mt-6 flex flex-col gap-3">
        <Link
          href="/admin/overview"
          className="rounded-md border border-gray-300 px-4 py-3 text-base font-medium"
        >
          Monatsuebersicht
        </Link>
        <Link
          href="/admin/employees"
          className="rounded-md border border-gray-300 px-4 py-3 text-base font-medium"
        >
          Mitarbeiter verwalten
        </Link>
        <Link
          href="/admin/settings"
          className="rounded-md border border-gray-300 px-4 py-3 text-base font-medium"
        >
          Globale Einstellungen
        </Link>
      </nav>

      <p className="mt-6 text-sm text-gray-500">
        Export folgt ab US-08.
      </p>

      <form action={logout} className="mt-8">
        <button
          type="submit"
          className="min-h-12 rounded-md border border-gray-300 px-4 text-base font-medium"
        >
          Abmelden
        </button>
      </form>
    </main>
  );
}
