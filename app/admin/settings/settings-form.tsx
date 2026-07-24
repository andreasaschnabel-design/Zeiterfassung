"use client";

import { useActionState } from "react";
import { saveSettings, type FormState } from "./actions";
import type { Settings } from "@/lib/queries/settings";

const initial: FormState = {};

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(saveSettings, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="minimumWage" className="text-sm font-medium">
          Mindestlohn (€/Stunde)
        </label>
        <input id="minimumWage" name="minimumWage" inputMode="decimal" required
          defaultValue={settings.minimumWage}
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="earningsLimit" className="text-sm font-medium">
          Entgeltgrenze (€/Monat)
        </label>
        <input id="earningsLimit" name="earningsLimit" inputMode="decimal" required
          defaultValue={settings.earningsLimit}
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="employerName" className="text-sm font-medium">
          Firmenname (employerName)
        </label>
        <input id="employerName" name="employerName" defaultValue={settings.employerName}
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
        {settings.employerName.trim() === "" ? (
          <p className="text-sm text-amber-800">
            Ohne Firmenname ist der PDF-/CSV-Export spaeter gesperrt (US-08).
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">{state.error}</p>
      ) : null}

      <button type="submit" disabled={pending}
        className="min-h-12 rounded-md bg-gray-900 px-4 text-base font-medium text-white disabled:opacity-60">
        {pending ? "Speichern ..." : "Speichern"}
      </button>
    </form>
  );
}
