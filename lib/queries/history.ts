import { prisma } from "@/lib/prisma";

// US-11: Audit-Historie eines Eintrags. AuditLog ist NICHT von der
// Soft-Delete-Middleware betroffen (die gilt nur fuer Model TimeEntry).

/** AK-1/AK-2: vollstaendige Historie, chronologisch, mit Urheber-Rolle (AK-3). */
export async function getEntryHistory(entryId: string) {
  return prisma.auditLog.findMany({
    where: { timeEntryId: entryId },
    orderBy: { changedAt: "asc" },
    include: { changedBy: { select: { name: true, role: true } } },
  });
}

/**
 * US-11 (Kritisch): Mitarbeiter sieht Fremdaenderungen an EIGENEN Eintraegen —
 * `changedById: { not: user.id }`. Kein Link auf die Admin-Route.
 */
export async function getForeignChanges(entryId: string, excludeUserId: string) {
  return prisma.auditLog.findMany({
    where: { timeEntryId: entryId, changedById: { not: excludeUserId } },
    orderBy: { changedAt: "asc" },
    include: { changedBy: { select: { role: true } } },
  });
}
