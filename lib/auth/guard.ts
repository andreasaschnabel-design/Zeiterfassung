import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { TimeEntry, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/auth/cookie";
import { validateSession } from "@/lib/auth/session";
import { EDIT_GRACE_DAYS } from "@/lib/constants";
import { dbDateToIso, isEmployeeEditable, todayISO } from "@/lib/time/dates";

// US-01, Uebergabe: requireUser() / requireAdmin() sind ab hier die
// VERBINDLICHEN Einstiegspunkte jeder geschuetzten Route bzw. Server-Action.
// DE-06: Die echte Autorisierung passiert hier (mit DB-Zugriff), nicht in der
// Edge-Middleware.

/** Aktueller Nutzer aus dem Session-Cookie oder `null`. */
export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSession(token);
}

/** AK-3: Ohne gueltige Session → Redirect auf /login. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** AK-4: /admin/* nur mit Rolle ADMIN; sonst zurueck ins Mitarbeiter-Dashboard. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/**
 * US-10 (Kritisch): Laedt und prueft in EINEM Schritt. Admin-Konten sind ueber
 * Mitarbeiter-Verwaltungspfade nicht adressierbar — ein Nicht-EMPLOYEE (oder
 * eine unbekannte id) fuehrt zu notFound(). Gilt fuer ALLE Mitarbeiter-Actions,
 * auch setEmployeeActive.
 */
export async function requireEmployeeTarget(id: string): Promise<User> {
  await requireAdmin();
  const employee = await prisma.user.findUnique({ where: { id } });
  if (!employee || employee.role !== "EMPLOYEE") notFound();
  return employee;
}

// US-04: Ergebnis von requireOwnEditableEntry. Der Guard WIRFT NICHT bei den
// eintragsbezogenen Faellen (Kritisch) — sonst landet die Meldung auf der
// Next.js-Fehlerseite statt im Formular. Der Aufrufer entscheidet:
//   - reason "not_found" → notFound() (AK-9: Existenz verschleiern)
//   - reason "locked"    → sprechende Meldung im Formular (AK-2)
export type EditableEntryResult =
  | { ok: true; entry: TimeEntry }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "locked"; message: string; entry: TimeEntry };

/**
 * US-04: Prueft, ob der angemeldete Mitarbeiter diesen Eintrag bearbeiten darf.
 *
 * findUnique ist von der Soft-Delete-Middleware ausgenommen (DE-04) — ein
 * bereits geloeschter Eintrag zaehlt hier als "nicht adressierbar".
 * `now` ist injizierbar (Karenzfrist testbar ohne Systemzeit-Manipulation).
 */
export async function requireOwnEditableEntry(
  id: string,
  now: Date = new Date(),
): Promise<EditableEntryResult> {
  const user = await requireUser();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });

  // AK-9: fremd / geloescht / unbekannt → nicht adressierbar.
  if (!entry || entry.deletedAt !== null || entry.userId !== user.id) {
    return { ok: false, reason: "not_found" };
  }

  // AK-1/AK-2: Karenzfrist.
  if (
    !isEmployeeEditable(dbDateToIso(entry.workDate), todayISO(now), EDIT_GRACE_DAYS)
  ) {
    return {
      ok: false,
      reason: "locked",
      message:
        "Dieser Eintrag liegt ausserhalb deines Bearbeitungszeitraums. Nur der Admin kann ihn noch aendern.",
      entry,
    };
  }

  return { ok: true, entry };
}

/**
 * US-07: Admin-Zugriff auf einen beliebigen Eintrag.
 *
 * Prueft `isEmployeeEditable` BEWUSST NICHT — der Admin ist der Eskalationsweg
 * und unterliegt weder Karenzfrist noch MAX_BACKDATE_DAYS. Fremd/geloescht/
 * unbekannt → notFound(). Liefert Admin und Eintrag; `entry.userId` ist der
 * betroffene Mitarbeiter (fuer die Konfliktpruefung, AK-9).
 */
export async function requireAdminEntryAccess(
  id: string,
): Promise<{ admin: User; entry: TimeEntry }> {
  const admin = await requireAdmin();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.deletedAt !== null) notFound();
  return { admin, entry };
}
