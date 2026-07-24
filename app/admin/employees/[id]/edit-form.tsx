"use client";

import { useActionState } from "react";
import { updateEmployee, type FormState } from "../actions";

const initial: FormState = {};

export function EditEmployeeForm({
  employee,
}: {
  employee: {
    id: string;
    name: string;
    email: string;
    hourlyRate: string;
    monthlyLimitHours: string;
  };
}) {
  const [state, formAction, pending] = useActionState(updateEmployee, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="id" value={employee.id} />

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <input id="name" name="name" required defaultValue={employee.name}
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">E-Mail</label>
        <input id="email" name="email" type="email" required defaultValue={employee.email}
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="hourlyRate" className="text-sm font-medium">Stundensatz (€)</label>
        <input id="hourlyRate" name="hourlyRate" inputMode="decimal" required
          defaultValue={employee.hourlyRate}
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="monthlyLimitHours" className="text-sm font-medium">
          Monatslimit (Stunden)
        </label>
        <input id="monthlyLimitHours" name="monthlyLimitHours" inputMode="decimal" required
          defaultValue={employee.monthlyLimitHours}
          className="min-h-12 rounded-md border border-gray-300 px-3 text-base" />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">{state.error}</p>
      ) : null}

      <button type="submit" disabled={pending}
        className="min-h-12 rounded-md bg-gray-900 px-4 text-base font-medium text-white disabled:opacity-60">
        {pending ? "Speichern ..." : "Stammdaten speichern"}
      </button>
    </form>
  );
}
