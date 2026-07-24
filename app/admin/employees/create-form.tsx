"use client";

import { useActionState, useState } from "react";
import { createEmployee, type FormState } from "./actions";

const initial: FormState = {};

export function CreateEmployeeForm({ earningsLimit }: { earningsLimit: string }) {
  const [state, formAction, pending] = useActionState(createEmployee, initial);
  const [rate, setRate] = useState("13,90");

  // Live-Vorschlag Monatslimit = floor(earningsLimit / hourlyRate).
  // Der Server ist die Quelle der Wahrheit; das hier ist nur Komfort.
  const suggestion = (() => {
    const limit = Number(earningsLimit.replace(",", "."));
    const r = Number(rate.replace(",", "."));
    if (!Number.isFinite(limit) || !Number.isFinite(r) || r <= 0) return null;
    return Math.floor(limit / r);
  })();

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <input id="name" name="name" required
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">E-Mail</label>
        <input id="email" name="email" type="email" autoComplete="off" required
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="hourlyRate" className="text-sm font-medium">Stundensatz (€)</label>
        <input id="hourlyRate" name="hourlyRate" inputMode="decimal" required
          value={rate} onChange={(e) => setRate(e.target.value)}
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="monthlyLimitHours" className="text-sm font-medium">
          Monatslimit (Stunden)
        </label>
        <input id="monthlyLimitHours" name="monthlyLimitHours" inputMode="decimal"
          required defaultValue={40}
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
        {suggestion !== null ? (
          <p className="text-sm text-gray-500">Vorschlag: {suggestion} Stunden</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">Initialpasswort</label>
        {/* Der Browser soll das Mitarbeiterpasswort nicht unter dem
            Admin-Profil speichern (US-10, Kritisch). */}
        <input id="password" name="password" type="text" minLength={10} required
          autoComplete="new-password" data-1p-ignore data-lpignore="true"
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
        <p className="text-sm text-gray-500">Mindestens 10 Zeichen.</p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">{state.error}</p>
      ) : null}

      <button type="submit" disabled={pending}
        className="min-h-12 rounded-md bg-gray-900 px-4 text-base font-medium text-white disabled:opacity-60">
        {pending ? "Anlegen ..." : "Mitarbeiter anlegen"}
      </button>
    </form>
  );
}
