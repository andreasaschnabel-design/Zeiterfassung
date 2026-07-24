"use client";

import { useActionState, useState } from "react";
import { resetPassword, type ResetState } from "./reset-actions";
import { generatePassword } from "@/lib/auth/password-generator";

const initial: ResetState = {};

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initial);
  // Das Klartextpasswort lebt NUR im Client-State (US-12, Kritisch). Der Server
  // gibt es nie zurueck.
  const [password, setPassword] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setPassword(generatePassword())}
          className="min-h-12 rounded-md border border-gray-300 px-4 text-base font-medium"
        >
          Passwort generieren
        </button>
        {password ? (
          <code className="rounded bg-gray-100 px-3 py-2 text-base">{password}</code>
        ) : (
          <span className="text-sm text-gray-500">
            Noch kein Passwort erzeugt.
          </span>
        )}
      </div>

      <form action={formAction}>
        <input type="hidden" name="userId" value={userId} />
        {/* Traegt den im Client erzeugten Wert zum Server (der ihn hasht). */}
        <input type="hidden" name="password" value={password} />
        <button
          type="submit"
          disabled={pending || password.length < 10}
          className="min-h-12 rounded-md bg-gray-900 px-4 text-base font-medium text-white disabled:opacity-60"
        >
          {pending ? "Setze zurueck ..." : "Passwort zuruecksetzen"}
        </button>
      </form>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">{state.error}</p>
      ) : null}

      {state.done ? (
        <div
          role="status"
          className="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900"
        >
          <p className="font-medium">Passwort wurde zurueckgesetzt.</p>
          <p className="mt-1">
            Neues Passwort (nur jetzt sichtbar — bitte notieren und dem
            Mitarbeiter persoenlich mitteilen):
          </p>
          <p className="mt-2">
            <code className="rounded bg-white px-2 py-1 text-base">{password}</code>
          </p>
          <p className="mt-2 text-green-800">
            Alle bestehenden Sitzungen wurden beendet.
          </p>
        </div>
      ) : null}
    </div>
  );
}
