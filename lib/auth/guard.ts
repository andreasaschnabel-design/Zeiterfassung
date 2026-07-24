import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/auth/cookie";
import { validateSession } from "@/lib/auth/session";

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
