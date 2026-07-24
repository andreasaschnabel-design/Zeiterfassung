"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
  requireAdminEntryAccess,
  requireEmployeeTarget,
} from "@/lib/auth/guard";
import { calculateDuration } from "@/lib/time/core";
import { dbDateToIso, isoDateToDbDate, todayISO } from "@/lib/time/dates";
import { findDayConflict } from "@/lib/queries/overlap";
import { timeEntrySnapshot, type TimeEntrySnapshot } from "@/lib/audit/snapshot";
import { diffEntry } from "@/lib/audit/diff";
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
} from "@/lib/validation/timeentry";

export type FormState = { error?: string };

// US-07: eigene Admin-Actions. Die Rechenlogik (calculateDuration, diffEntry,
// findDayConflict) ist mit US-02/US-04 geteilt; die drei sicherheitsrelevanten
// Zeilen unterscheiden sich BEWUSST (Guard, userId-Quelle, changedById), statt
// ein if(isAdmin) in die Berechtigungslogik zu legen.

// AK-7/AK-8/AK-10: Eintrag eines Mitarbeiters korrigieren.
export async function adminUpdateTimeEntry(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  // Guard OHNE Karenzpruefung (Admin ist Eskalationsweg).
  const { admin, entry } = await requireAdminEntryAccess(id);

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
  const workDateISO = dbDateToIso(entry.workDate);

  // AK-9 (haeufigster Fehler): Konfliktpruefung gegen den BETROFFENEN
  // Mitarbeiter (entry.userId), nicht admin.id.
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

  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.update({
      where: { id: entry.id },
      data: { startTime, endTime, breakMinutes, durationMinutes, note: note ?? null },
    });
    if (diff) {
      await tx.auditLog.create({
        data: {
          timeEntryId: entry.id,
          changedById: admin.id, // AK-10
          action: "UPDATE",
          oldValues: diff.old,
          newValues: diff.new,
        },
      });
    }
  });

  redirect(`/admin/employees/${entry.userId}?month=${workDateISO.slice(0, 7)}`);
}

// AK-11: Admin kann loeschen (Soft-Delete, Vollzustand protokolliert).
export async function adminDeleteTimeEntry(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const { admin, entry } = await requireAdminEntryAccess(id);
  const workDateISO = dbDateToIso(entry.workDate);

  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.update({
      where: { id: entry.id },
      data: { deletedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        timeEntryId: entry.id,
        changedById: admin.id,
        action: "DELETE",
        oldValues: timeEntrySnapshot(entry),
      },
    });
  });

  redirect(`/admin/employees/${entry.userId}?month=${workDateISO.slice(0, 7)}`);
}

// AK-12: Admin kann anlegen, OHNE MAX_BACKDATE_DAYS. Zukunft bleibt gesperrt.
export async function adminCreateTimeEntry(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const employee = await requireEmployeeTarget(userId); // admin-only, EMPLOYEE

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

  // Keine MAX_BACKDATE_DAYS-Grenze fuer den Admin — nur Zukunft bleibt gesperrt.
  if (workDate > todayISO()) {
    return { error: "Ein Zukunftsdatum ist nicht erlaubt." };
  }

  const conflict = await findDayConflict({
    userId: employee.id, // AK-9: betroffener Mitarbeiter
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

  const durationMinutes = calculateDuration({ startTime, endTime, breakMinutes });

  await prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.create({
      data: {
        userId: employee.id,
        workDate: isoDateToDbDate(workDate),
        startTime,
        endTime,
        breakMinutes,
        durationMinutes,
        note: note ?? null,
        createdById: admin.id, // Kritisch: createdById !== userId bei Admin-Anlage
      },
    });
    await tx.auditLog.create({
      data: {
        timeEntryId: entry.id,
        changedById: admin.id, // AK-10
        action: "CREATE",
        newValues: timeEntrySnapshot(entry),
      },
    });
  });

  redirect(`/admin/employees/${employee.id}?month=${workDate.slice(0, 7)}`);
}
