"use client";

import { useActionState, useState } from "react";
import {
  deleteTimeEntry,
  updateTimeEntry,
  type FormState,
} from "../actions";
import {
  arbeitszeitHinweise,
  calculateDuration,
  formatMinutes,
  isValidHHMM,
} from "@/lib/time/core";

const initial: FormState = {};
const BREAK_CHIPS = [0, 15, 30, 45];

export function EditEntryForm({
  entry,
}: {
  entry: {
    id: string;
    workDate: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    note: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(updateTimeEntry, initial);
  const [delState, delAction, delPending] = useActionState(
    deleteTimeEntry,
    initial,
  );

  const [start, setStart] = useState(entry.startTime);
  const [end, setEnd] = useState(entry.endTime);
  const [breakMinutes, setBreakMinutes] = useState(entry.breakMinutes);

  const duration =
    isValidHHMM(start) && isValidHHMM(end)
      ? calculateDuration({ startTime: start, endTime: end, breakMinutes })
      : null;
  const hints =
    duration !== null && duration > 0
      ? arbeitszeitHinweise(duration, breakMinutes)
      : [];

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="id" value={entry.id} />

        {/* AK-3: Datum ist nicht editierbar. */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Datum</span>
          <p className="min-h-12 rounded-md border border-gray-200 bg-gray-50 px-3 leading-[3rem] text-gray-600">
            {entry.workDate}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="startTime" className="text-sm font-medium">Beginn</label>
            <input id="startTime" name="startTime" type="time" required
              value={start} onChange={(e) => setStart(e.target.value)}
              className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="endTime" className="text-sm font-medium">Ende</label>
            <input id="endTime" name="endTime" type="time" required
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

        <details open={Boolean(entry.note)}>
          <summary className="cursor-pointer text-sm font-medium">Notiz (optional)</summary>
          <textarea name="note" rows={2} maxLength={500} defaultValue={entry.note ?? ""}
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-base" />
        </details>

        <div aria-live="polite" className="text-sm text-gray-700">
          {duration !== null ? (
            duration > 0 ? (
              <p>Dauer: {formatMinutes(duration)} Std</p>
            ) : (
              <p className="text-red-700">
                Ende muss nach Beginn liegen und die Pause kleiner als die Arbeitszeit sein.
              </p>
            )
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
          {pending ? "Speichern ..." : "Aenderung speichern"}
        </button>
      </form>

      <form action={delAction} className="border-t pt-6"
        onSubmit={(e) => {
          if (!window.confirm("Diesen Eintrag wirklich loeschen?")) e.preventDefault();
        }}>
        <input type="hidden" name="id" value={entry.id} />
        {delState.error ? (
          <p role="alert" className="mb-2 text-sm text-red-700">{delState.error}</p>
        ) : null}
        <button type="submit" disabled={delPending}
          className="min-h-12 rounded-md border border-red-300 px-4 text-base font-medium text-red-700 disabled:opacity-60">
          {delPending ? "Loeschen ..." : "Eintrag loeschen"}
        </button>
      </form>
    </div>
  );
}
