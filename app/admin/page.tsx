import { requireAdmin } from "@/lib/auth/guard";
import { logout } from "../(auth)/login/actions";

// Platzhalter: demonstriert die Rollen-Schranke (AK-4). Der eigentliche
// Adminbereich (Uebersicht, Stammdaten, Export ...) folgt ab US-06.
export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Adminbereich</h1>
      <p className="mt-2 text-gray-600">
        Angemeldet als {user.name}. Inhalte folgen ab US-06.
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
