import { createHash, randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_DAYS } from "@/lib/constants";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * US-01 (Kritisch): In der DB steht nur `sha256(token)` als `Session.id`,
 * niemals der Token selbst. Ein DB-Leak gibt dann keine gueltigen Sessions her.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Opakes Session-Token (256 Bit, base64url). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Legt eine neue Session an und gibt das (ungehashte) Token zurueck. */
export async function createSession(
  userId: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const id = hashToken(token);
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * DAY_MS);
  await prisma.session.create({ data: { id, userId, expiresAt } });
  return { token, expiresAt };
}

/**
 * US-01 (Kritisch): Session-Fixation-Schutz. Vor jedem neuen Login werden alle
 * bestehenden Sessions des Nutzers invalidiert.
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/** AK-7: Beendet die Session zum uebergebenen Token. */
export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}

/**
 * Validiert ein Token und liefert den zugehoerigen Nutzer oder `null`.
 *
 * - AK-2: Laufzeit 30 Tage, Verlaengerung hoechstens einmal taeglich.
 * - AK-5 / Kritisch: `isActive` wird HIER geprueft, nicht nur beim Login —
 *   ein deaktivierter Nutzer fliegt sofort raus, nicht erst in 30 Tagen.
 *
 * `now` ist injizierbar, damit die Zeitlogik ohne Systemzeit-Manipulation
 * testbar ist.
 */
export async function validateSession(
  token: string,
  now: Date = new Date(),
): Promise<User | null> {
  const id = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!session) return null;

  // Abgelaufen: aufraeumen und ablehnen.
  if (session.expiresAt.getTime() <= now.getTime()) {
    await prisma.session.deleteMany({ where: { id } });
    return null;
  }

  // Deaktivierter Nutzer: Session sofort beenden.
  if (!session.user.isActive) {
    await prisma.session.deleteMany({ where: { id } });
    return null;
  }

  // Verlaengerung hoechstens einmal taeglich. Das Session-Modell haelt nur
  // `expiresAt`; "seit der letzten Verlaengerung ist mehr als ein Tag vergangen"
  // ist damit aequivalent zu "Restlaufzeit < (SESSION_DAYS - 1) Tage".
  const remaining = session.expiresAt.getTime() - now.getTime();
  if (remaining < (SESSION_DAYS - 1) * DAY_MS) {
    const newExpiry = new Date(now.getTime() + SESSION_DAYS * DAY_MS);
    await prisma.session.update({
      where: { id },
      data: { expiresAt: newExpiry },
    });
    session.expiresAt = newExpiry;
  }

  return session.user;
}
