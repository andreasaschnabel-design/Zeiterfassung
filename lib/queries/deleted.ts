import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { dbDateToIso } from "@/lib/time/dates";

// US-11 (Kritisch): Die Soft-Delete-Middleware verbirgt geloeschte TimeEntry-
// Zeilen bei findMany etc. Die LISTE geloeschter Eintraege laeuft daher ueber
// $queryRaw (umgeht die Middleware). requireAdmin() steht IN der Funktion.

type DeletedRow = {
  id: string;
  workDate: Date;
  deletedAt: Date;
  userName: string;
};

export type DeletedEntry = {
  id: string;
  workDate: string; // ISO — Arbeitstag (NICHT deletedAt)
  deletedAt: Date;
  userName: string;
};

export async function getDeletedEntries(): Promise<DeletedEntry[]> {
  await requireAdmin();

  const rows = await prisma.$queryRaw<DeletedRow[]>`
    SELECT te."id", te."workDate", te."deletedAt", u."name" AS "userName"
    FROM "TimeEntry" te
    JOIN "User" u ON u."id" = te."userId"
    WHERE te."deletedAt" IS NOT NULL
    ORDER BY te."workDate" DESC, te."deletedAt" DESC
  `;

  // Zuordnung nach workDate (Arbeitstag), nicht nach deletedAt.
  return rows.map((r) => ({
    id: r.id,
    workDate: dbDateToIso(r.workDate),
    deletedAt: r.deletedAt,
    userName: r.userName,
  }));
}
