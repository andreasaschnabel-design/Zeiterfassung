import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { getSettings } from "@/lib/queries/settings";
import { SettingsForm } from "./settings-form";

// US-10/AK-6: Globale Parameter pflegen.
export default async function SettingsPage() {
  await requireAdmin(); // AK-7
  const settings = await getSettings();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Globale Einstellungen</h1>
        <Link href="/admin" className="text-sm text-blue-700 underline">
          Zum Adminbereich
        </Link>
      </div>
      <SettingsForm settings={settings} />
    </main>
  );
}
