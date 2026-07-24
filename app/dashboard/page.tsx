import { requireUser } from "@/lib/auth/guard";
import { logout } from "../(auth)/login/actions";

// Mitarbeiter-Landing nach dem Login. Inhalt (Eingabe + Monatsansicht) folgt
// mit US-02/US-05 — hier nur der Auth-Nachweis fuer US-01.
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Angemeldet als {user.name}</h1>
      <p className="mt-2 text-gray-600">Rolle: {user.role}</p>

      {user.role === "ADMIN" ? (
        <p className="mt-4">
          <a href="/admin" className="text-blue-700 underline">
            Zum Adminbereich
          </a>
        </p>
      ) : null}

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
