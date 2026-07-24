import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
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
