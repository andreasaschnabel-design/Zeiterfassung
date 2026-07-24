import { z } from "zod";

// Euro-/Stunden-Decimal ("13,90" | "13.90") -> normalisierter String "13.90".
// Decimal(5,2) in der DB: max 999.99.
function decimal(max: number, label: string) {
  return z.string().transform((raw, ctx) => {
    const norm = raw.trim().replace(",", ".");
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(norm)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} ungueltig` });
      return z.NEVER;
    }
    const value = Number(norm);
    if (!Number.isFinite(value) || value <= 0 || value > max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} ausserhalb des zulaessigen Bereichs` });
      return z.NEVER;
    }
    return value.toFixed(2);
  });
}

// US-10/AK-2: Anlegen mit Name, E-Mail, Stundensatz, Monatslimit,
// Initialpasswort. KEIN role-Feld — angelegt wird immer EMPLOYEE.
export const createEmployeeSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt").max(100),
  email: z.string().trim().toLowerCase().email("E-Mail ungueltig"),
  hourlyRate: decimal(999.99, "Stundensatz"),
  monthlyLimitHours: decimal(999.99, "Monatslimit"),
  // Mindestlaenge 10 Zeichen (US-10, referenziert in US-12/AK-3).
  password: z.string().min(10, "Passwort mindestens 10 Zeichen"),
});

// US-10/AK-4: Stammdaten bearbeitbar (ohne Passwort — Reset ist US-12).
export const updateEmployeeSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt").max(100),
  email: z.string().trim().toLowerCase().email("E-Mail ungueltig"),
  hourlyRate: decimal(999.99, "Stundensatz"),
  monthlyLimitHours: decimal(999.99, "Monatslimit"),
});

// US-10/AK-6: Globale Parameter. employerName darf leer sein (Export bleibt
// dann gesperrt, US-08).
export const settingsSchema = z.object({
  minimumWage: decimal(999.99, "Mindestlohn"),
  earningsLimit: decimal(99999.99, "Entgeltgrenze"),
  employerName: z.string().trim().max(200),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
