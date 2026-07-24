import { requireAdmin } from "@/lib/auth/guard";
import { getSettings, type Settings } from "@/lib/queries/settings";

// US-08 (Kritisch): employerName ist Pflicht fuer den Export. requireExportReady()
// prueft das vorab; das UI blendet die Buttons aus und verlinkt auf die
// Einstellungen. `requireAdmin()` (AK-4) laeuft immer zuerst.

export type ExportReady =
  | { ready: true; settings: Settings }
  | { ready: false };

export async function requireExportReady(): Promise<ExportReady> {
  await requireAdmin(); // AK-4 — leitet Nicht-Admins um
  const settings = await getSettings();
  if (settings.employerName.trim() === "") {
    return { ready: false };
  }
  return { ready: true, settings };
}
