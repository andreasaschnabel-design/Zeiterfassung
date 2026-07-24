"use client";

import { useActionState, useState } from "react";
import { adminCreateTimeEntry, type FormState } from "../../entries/actions";
import {
  arbeitszeitHinweise,
  calculateDuration,
  formatMinutes,
  isValidHHMM,
} from "@/lib/time/core";

const initial: FormState = {};
const BREAK_CHIPS = [0, 15, 30, 45];

// US-07/AK-12: Admin erfasst eine Zeit fuer einen Mitarbeiter (ohne
// MAX_BACKDATE_DAYS). `today` = heutiges Datum (Europe/Berlin) fuer die
// Zukunftssperre im Picker.
export function AdminCreateEntryForm({
  userId,
  today,
}: {
  userId: string;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(
    adminCreateTimeEntry,
    initial,
  );
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [breakMinutes, setBreakMinutes] = useState(30);

  const duration =
    isValidHHMM(start) && isValidHHMM(end)
      ? calculateDuration({ startTime: start, endTime: end, breakMinutes })
      : null;
  const hints =
    duration !== null && duration > 0
      ? arbeitszeitHinweise(duration, breakMinutes)
      : [];

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="userId" value={userId} />

      <div className="flex flex-col gap-1">
        <label htmlFor="c-workDate" className="text-sm font-medium">Datum</label>
        {/* Kein MAX_BACKDATE_DAYS fuer den Admin; Zukunft bleibt gesperrt. */}
        <input id="c-workDate" name="workDate" type="date" required
          defaultValue={today} max={today}
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="c-startTime" className="text-sm font-medium">Beginn</label>
          <input id="c-startTime" name="startTime" type="time" required
            value={start} onChange={(e) => setStart(e.target.value)}
            className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="c-endTime" className="text-sm font-medium">Ende</label>
          <input id="c-endTime" name="endTime" type="time" required
            value={end} onChange={(e) => setEnd(e.target.value)}
            className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Pause</legend>
        <div className="flex gap-2">
          {BREAK_CHIPS.map((value) => (
            <label key={value}
              className={`min-h-12 flex-1 cursor-pointer rounded-md border px-3 text-center text-base leading-[3rem] ${
                breakMinutes === value
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300"
              }`}>
              <input type="radio" name="breakMinutes" value={value}
                checked={breakMinutes === value}
                onChange={() => setBreakMinutes(value)} className="sr-only" />
              {value} min
            </label>
          ))}
        </div>
      </fieldset>

      <details>
        <summary className="cursor-pointer text-sm font-medium">Notiz (optional)</summary>
        <textarea name="note" rows={2} maxLength={500}
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-base" />
      </details>

      <div aria-live="polite" className="text-sm text-gray-700">
        {duration !== null && duration > 0 ? (
          <p>Dauer: {formatMinutes(duration)} Std</p>
        ) : null}
        {hints.map((h) => (
          <p key={h} className="text-amber-800">{h}</p>
        ))}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">{state.error}</p>
      ) : null}

      <button type="submit" disabled={pending}
        className="min-h-12 rounded-md bg-gray-900 px-4 text-base font-medium text-white disabled:opacity-60">
        {pending ? "Anlegen ..." : "Zeit fuer Mitarbeiter erfassen"}
      </button>
    </form>
  );
}
