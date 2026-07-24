import { z } from "zod";
import { HHMM_RE, isValidHHMM, parseHHMM } from "@/lib/time/core";

// US-02 (Kritisch): Bereichspruefung der Uhrzeit ins Zod-Schema (regex/refine),
// nicht per Non-Null-Assertion. "99:99" ist regexkonform NICHT gueltig.
const hhmm = z.string().regex(HHMM_RE, "Ungueltige Uhrzeit (HH:MM).");

export const createTimeEntrySchema = z
  .object({
    workDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ungueltiges Datum."),
    startTime: hhmm,
    endTime: hhmm,
    breakMinutes: z.coerce
      .number()
      .int("Pause in ganzen Minuten.")
      .min(0, "Pause darf nicht negativ sein.")
      .max(24 * 60, "Pause zu gross."),
    // Optionale Notiz; leer -> undefined.
    note: z.preprocess(
      (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
      z.string().max(500, "Notiz zu lang.").optional(),
    ),
  })
  .superRefine((val, ctx) => {
    // Nur pruefen, wenn die Uhrzeiten selbst gueltig sind (sonst haengen schon
    // Feldfehler an start/end).
    if (!isValidHHMM(val.startTime) || !isValidHHMM(val.endTime)) return;

    const start = parseHHMM(val.startTime);
    const end = parseHHMM(val.endTime);

    // AK-3: Ende <= Beginn abgelehnt.
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "Das Ende muss nach dem Beginn liegen.",
      });
      return;
    }

    // AK-4: Pause >= Brutto-Arbeitszeit abgelehnt.
    if (val.breakMinutes >= end - start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["breakMinutes"],
        message: "Die Pause darf nicht die gesamte Arbeitszeit umfassen.",
      });
    }
  });

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
