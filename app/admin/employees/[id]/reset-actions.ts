"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireEmployeeTarget } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/hash";

// US-12: Passwort zuruecksetzen.
export type ResetState = { error?: string; done?: boolean };

export async function resetPassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const admin = await requireAdmin(); // Actor fuer das SecurityLog
  const userId = String(formData.get("userId") ?? "");
  const employee = await requireEmployeeTarget(userId); // AK-5

  const password = String(formData.get("password") ?? "");
  // AK-3: gleiche Regeln wie US-10 (min. 10 Zeichen), hashPassword wiederverwenden.
  if (password.length < 10) {
    return { error: "Das Passwort muss mindestens 10 Zeichen haben." };
  }
  const passwordHash = await hashPassword(password);

  // AK-4 + Kritisch: Passwortaenderung und Session-Loeschung in DERSELBEN
  // Transaktion. AK-6: Vorgang protokolliert; AK-7: der Hash erscheint NIE im
  // Protokoll (details enthaelt nur unkritische Metadaten). SecurityLog statt
  // AuditLog (andere Aufbewahrungspflicht).
  await prisma.$transaction([
    prisma.user.update({
      where: { id: employee.id },
      data: { passwordHash },
    }),
    prisma.session.deleteMany({ where: { userId: employee.id } }),
    prisma.securityLog.create({
      data: {
        action: "PASSWORD_RESET",
        targetUserId: employee.id,
        actorId: admin.id,
        details: { method: "admin_reset" },
      },
    }),
  ]);

  // Kritisch: Das Klartextpasswort wird NICHT zurueckgegeben — es landet sonst
  // in der RSC-Antwort, in DevTools und Proxy-Logs. Der Client haelt den Wert
  // in seinem eigenen State (er hat ihn ja gesendet).
  return { done: true };
}
