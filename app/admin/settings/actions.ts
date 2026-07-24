"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { settingsSchema } from "@/lib/validation/employee";
import { updateSettings } from "@/lib/queries/settings";

export type FormState = { error?: string };

// US-10/AK-6: Globale Parameter pflegen.
export async function saveSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin(); // AK-7

  const parsed = settingsSchema.safeParse({
    minimumWage: formData.get("minimumWage"),
    earningsLimit: formData.get("earningsLimit"),
    employerName: formData.get("employerName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungueltig" };
  }

  // Aendert nur die Setting-Tabelle — nicht rueckwirkend auf User.hourlyRate.
  await updateSettings(parsed.data);

  redirect("/admin/settings");
}
