"use client";

import { useActionState, useState } from "react";
import { createTimeEntry, type FormState } from "./actions";
import {
  arbeitszeitHinweise,
  calculateDuration,
  formatMinutes,
  isValidHHMM,
} from "@/lib/time/core";
import { isEmployeeEditable } from "@/lib/time/dates";
import { EDIT_GRACE_DAYS } from "@/lib/constants";

const initial: FormState = {};
const BREAK_CHIPS = [0, 15, 30, 45];

// NFR-01: native type="date"/type="time", Pause als Chips, Notiz eingeklappt,
// Live-Dauer unter dem Formular, Button >= 48px. Ziel: 4 Taps.
export function EntryForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(createTimeEntry, initial);

  const [workDate, setWorkDate] = useState(today);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [breakMinutes, setBreakMinutes] = useState(30);

  // US-04 (Kritisch): Hinweis, wenn ein rueckdatierter Eintrag nach dem Anlegen
  // sofort nicht mehr durch den Mitarbeiter editierbar waere.
  const willBeLocked =
    /^\d{4}-\d{2}-\d{2}$/.test(workDate) &&
    !isEmployeeEditable(workDate, today, EDIT_GRACE_DAYS);

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
      <div className="flex flex-col gap-1">
        <label htmlFor="workDate" className="text-sm font-medium">Datum</label>
        <input
          id="workDate"
          name="workDate"
          type="date"
          required
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
          max={today} /* AK-6: kein Zukunftsdatum */
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base"
        />
        {willBeLocked ? (
          <p className="text-sm text-amber-800">
            Hinweis: Dieser Tag liegt ausserhalb deines Bearbeitungszeitraums —
            nach dem Speichern kannst nur noch der Admin ihn aendern.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="startTime" className="text-sm font-medium">Beginn</label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="min-h-12 rounded-md border border-gray-300 px-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="endTime" className="text-sm font-medium">Ende</label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="min-h-12 rounded-md border border-gray-300 px-3 text-base"
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Pause</legend>
        <div className="flex gap-2">
          {BREAK_CHIPS.map((value) => (
            <label
              key={value}
              className={`min-h-12 flex-1 cursor-pointer rounded-md border px-3 text-center text-base leading-[3rem] ${
                breakMinutes === value
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="breakMinutes"
                value={value}
                checked={breakMinutes === value}
                onChange={() => setBreakMinutes(value)}
                className="sr-only"
              />
              {value} min
            </label>
          ))}
        </div>
      </fieldset>

      <details>
        <summary className="cursor-pointer text-sm font-medium">
          Notiz (optional)
        </summary>
        <textarea
          name="note"
          rows={2}
          maxLength={500}
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </details>

      <div aria-live="polite" className="text-sm text-gray-700">
        {duration !== null ? (
          duration > 0 ? (
            <p>Dauer: {formatMinutes(duration)} Std</p>
          ) : (
            <p className="text-red-700">
              Ende muss nach Beginn liegen und die Pause kleiner als die
              Arbeitszeit sein.
            </p>
          )
        ) : (
          <p className="text-gray-400">Dauer wird berechnet, sobald Beginn und Ende gesetzt sind.</p>
        )}
        {hints.map((h) => (
          <p key={h} className="text-amber-800">{h}</p>
        ))}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-md bg-gray-900 px-4 text-base font-medium text-white disabled:opacity-60"
      >
        {pending ? "Speichern ..." : "Zeit erfassen"}
      </button>
    </form>
  );
}
