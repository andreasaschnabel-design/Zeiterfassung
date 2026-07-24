"use server";

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOwnEditableEntry } from "@/lib/auth/guard";
import { calculateDuration } from "@/lib/time/core";
import { dbDateToIso } from "@/lib/time/dates";
import { findDayConflict } from "@/lib/queries/overlap";
import { timeEntrySnapshot, type TimeEntrySnapshot } from "@/lib/audit/snapshot";
import { diffEntry } from "@/lib/audit/diff";
import { updateTimeEntrySchema } from "@/lib/validation/timeentry";

export type FormState = { error?: string };

// US-04: Eintrag korrigieren.
export async function updateTimeEntry(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const guard = await requireOwnEditableEntry(id);
  if (!guard.ok) {
    // AK-9: fremd/unbekannt verschleiern; AK-2: zu alt → Meldung ins Formular.
    if (guard.reason === "not_found") notFound();
    return { error: guard.message };
  }
  const entry = guard.entry;

  // AK-4: gleiche Validierung wie US-02, aber ohne Datum (AK-3).
  const parsed = updateTimeEntrySchema.safeParse({
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    breakMinutes: formData.get("breakMinutes"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Eingabe ungueltig." };
  }
  const { startTime, endTime, breakMinutes, note } = parsed.data;

  const workDateISO = dbDateToIso(entry.workDate); // Datum bleibt unveraendert

  // AK-5: Ueberschneidung schliesst den bearbeiteten Eintrag aus.
  const conflict = await findDayConflict({
    userId: entry.userId,
    workDateISO,
    startTime,
    endTime,
    excludeEntryId: entry.id,
  });
  if (conflict) {
    return {
      error:
        "Fuer diesen Tag gibt es bereits einen anderen Eintrag, der sich mit dieser Zeit ueberschneidet.",
    };
  }

  // AK-6: durationMinutes neu berechnet (einzige Quelle).
  const durationMinutes = calculateDuration({ startTime, endTime, breakMinutes });

  const before = timeEntrySnapshot(entry);
  const after: TimeEntrySnapshot = {
    workDate: workDateISO,
    startTime,
    endTime,
    breakMinutes,
    durationMinutes,
    note: note ?? null,
  };
  const diff = diffEntry(before, after);

  // BEWUSST NICHT GELÖST (US-04): kein optimistisches Sperren. Bei paralleler
  // Aenderung gewinnt der letzte Schreibvorgang; der ueberschriebene Wert
  // bleibt im AuditLog erhalten, ist also nicht verloren. Loesung falls noetig:
  // version-Feld + where:{ id, version }. Nicht ohne neue Abwaegung aendern.

  // AK-7: Aenderung + Audit atomar. diffEntry() = null → kein Protokollrauschen.
  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.update({
      where: { id: entry.id },
      data: { startTime, endTime, breakMinutes, durationMinutes, note: note ?? null },
    });
    if (diff) {
      await tx.auditLog.create({
        data: {
          timeEntryId: entry.id,
          changedById: entry.userId, // Selbstkorrektur
          action: "UPDATE",
          oldValues: diff.old,
          newValues: diff.new,
        },
      });
    }
  });

  redirect(`/dashboard?month=${workDateISO.slice(0, 7)}`);
}

// US-04/AK-8: Loeschen ist Soft-Delete.
export async function deleteTimeEntry(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const guard = await requireOwnEditableEntry(id);
  if (!guard.ok) {
    if (guard.reason === "not_found") notFound();
    return { error: guard.message };
  }
  const entry = guard.entry;
  const workDateISO = dbDateToIso(entry.workDate);

  // Kritisch: DELETE protokolliert den VOLLZUSTAND (nicht nur einen Diff) —
  // nach dem Loeschen ist der Eintrag aus jeder Liste verschwunden.
  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.update({
      where: { id: entry.id },
      data: { deletedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        timeEntryId: entry.id,
        changedById: entry.userId,
        action: "DELETE",
        oldValues: timeEntrySnapshot(entry),
      },
    });
  });

  redirect(`/dashboard?month=${workDateISO.slice(0, 7)}`);
}
