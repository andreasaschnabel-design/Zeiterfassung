"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, verifyDummy } from "@/lib/auth/hash";
import {
  createSession,
  destroySession,
  invalidateUserSessions,
} from "@/lib/auth/session";
import {
  clearRateLimit,
  isRateLimited,
  registerFailure,
} from "@/lib/auth/ratelimit";
import { SESSION_COOKIE } from "@/lib/auth/cookie";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// AK-1: Generische Meldung ohne Hinweis, welches Feld falsch war.
const GENERIC_ERROR = "E-Mail oder Passwort ist falsch.";
const LOCKED_ERROR =
  "Zu viele Fehlversuche. Bitte versuche es spaeter erneut.";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  // Auch ungueltige Eingaben bekommen nur die generische Meldung (AK-1).
  if (!parsed.success) return { error: GENERIC_ERROR };

  const email = parsed.data.email.trim().toLowerCase();
  const { password } = parsed.data;

  // US-01 (Kritisch): Rate-Limit greift VOR Argon2.
  if (await isRateLimited(email)) return { error: LOCKED_ERROR };

  const user = await prisma.user.findUnique({ where: { email } });

  // Unbekannte E-Mail: gegen konstanten Dummy-Hash verifizieren (Timing),
  // NICHT hashPassword() aufrufen.
  if (!user) {
    await verifyDummy(password);
    await registerFailure(email);
    return { error: GENERIC_ERROR };
  }

  const ok = await verifyPassword(user.passwordHash, password);

  // Falsches Passwort ODER inaktiver Nutzer (AK-5) → dieselbe Meldung.
  // Der Verify oben ist bereits gelaufen, die Laufzeit bleibt gleich.
  if (!ok || !user.isActive) {
    await registerFailure(email);
    return { error: GENERIC_ERROR };
  }

  // Erfolg: Es sollen Fehlversuche zaehlen, nicht Versuche → zuruecksetzen.
  await clearRateLimit(email);

  // US-01 (Kritisch): Session-Fixation — alte Sessions invalidieren, dann neu.
  await invalidateUserSessions(user.id);
  const { token, expiresAt } = await createSession(user.id);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt, // AK-2: 30 Tage, kein taegliches Neuanmelden.
  });

  // AK-4: Rolle bestimmt das Ziel. /admin/* ist zusaetzlich per requireAdmin()
  // geschuetzt.
  redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
}

// AK-7: Logout beendet die Session.
export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
