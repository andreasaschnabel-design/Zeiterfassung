import { z } from "zod";
import { HHMM_RE, isValidHHMM, parseHHMM } from "@/lib/time/core";

// US-02 (Kritisch): Bereichspruefung der Uhrzeit ins Zod-Schema (regex/refine),
// nicht per Non-Null-Assertion. "99:99" ist regexkonform NICHT gueltig.
const hhmm = z.string().regex(HHMM_RE, "Ungueltige Uhrzeit (HH:MM).");

const breakMinutes = z.coerce
  .number()
  .int("Pause in ganzen Minuten.")
  .min(0, "Pause darf nicht negativ sein.")
  .max(24 * 60, "Pause zu gross.");

// Optionale Notiz; leer -> undefined.
const note = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
  z.string().max(500, "Notiz zu lang.").optional(),
);

// AK-3/AK-4 (US-02) — Querpruefung Ende>Beginn und Pause<Brutto. Geteilt von
// Anlegen (US-02) und Korrektur (US-04), damit die Validierung identisch ist.
function crossCheck(
  val: { startTime: string; endTime: string; breakMinutes: number },
  ctx: z.RefinementCtx,
): void {
  if (!isValidHHMM(val.startTime) || !isValidHHMM(val.endTime)) return;

  const start = parseHHMM(val.startTime);
  const end = parseHHMM(val.endTime);

  if (end <= start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endTime"],
      message: "Das Ende muss nach dem Beginn liegen.",
    });
    return;
  }

  if (val.breakMinutes >= end - start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["breakMinutes"],
      message: "Die Pause darf nicht die gesamte Arbeitszeit umfassen.",
    });
  }
}

export const createTimeEntrySchema = z
  .object({
    workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ungueltiges Datum."),
    startTime: hhmm,
    endTime: hhmm,
    breakMinutes,
    note,
  })
  .superRefine(crossCheck);

// US-04/AK-3: Datum ist NICHT editierbar — dasselbe Schema ohne workDate.
export const updateTimeEntrySchema = z
  .object({
    startTime: hhmm,
    endTime: hhmm,
    breakMinutes,
    note,
  })
  .superRefine(crossCheck);

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
