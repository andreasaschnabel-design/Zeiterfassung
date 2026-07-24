"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import { MAX_BACKDATE_DAYS } from "@/lib/constants";
import { calculateDuration } from "@/lib/time/core";
import { isoDateToDbDate, todayISO, workDateError } from "@/lib/time/dates";
import { findDayConflict } from "@/lib/queries/overlap";
import { timeEntrySnapshot } from "@/lib/audit/snapshot";
import { createTimeEntrySchema } from "@/lib/validation/timeentry";

export type FormState = { error?: string };

// US-02: Zeiteintrag anlegen.
export async function createTimeEntry(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  // AK-8 / DB-Trigger: Eintraege gehoeren ausschliesslich EMPLOYEE-Konten.
  if (user.role !== "EMPLOYEE") {
    return { error: "Nur Mitarbeitende koennen Zeiten erfassen." };
  }

  const parsed = createTimeEntrySchema.safeParse({
    workDate: formData.get("workDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    breakMinutes: formData.get("breakMinutes"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungueltig." };
  }

  const { workDate, startTime, endTime, breakMinutes, note } = parsed.data;

  // AK-6 + Nachtragsgrenze (US-03): keine Zukunft, hoechstens 31 Tage zurueck.
  const dateError = workDateError(workDate, todayISO(), MAX_BACKDATE_DAYS);
  if (dateError) return { error: dateError };

  // AK-5: Ueberschneidung am selben Tag (userId aus Session).
  const conflict = await findDayConflict({
    userId: user.id,
    workDateISO: workDate,
    startTime,
    endTime,
  });
  if (conflict) {
    return {
      error:
        "Fuer diesen Tag gibt es bereits einen Eintrag, der sich mit dieser Zeit ueberschneidet.",
    };
  }

  // AK-2 / DE-01: Dauer aus der einzigen Quelle.
  const durationMinutes = calculateDuration({ startTime, endTime, breakMinutes });

  // DE-05: Schreibvorgang und Audit-CREATE atomar im selben Transaktionsblock.
  await prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.create({
      data: {
        userId: user.id, // AK-8: aus der Session, kein Formularfeld
        workDate: isoDateToDbDate(workDate), // Kritisch: nicht new Date(iso)
        startTime,
        endTime,
        breakMinutes,
        durationMinutes,
        note: note ?? null,
        createdById: user.id, // Selbsterfassung
      },
    });
    await tx.auditLog.create({
      data: {
        timeEntryId: entry.id,
        changedById: user.id,
        action: "CREATE",
        newValues: timeEntrySnapshot(entry),
      },
    });
  });

  // AK-7: Eintrag erscheint sofort in der Monatsliste.
  redirect("/dashboard");
}
