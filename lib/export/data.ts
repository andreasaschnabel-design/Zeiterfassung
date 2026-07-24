import { prisma } from "@/lib/prisma";
import { getMonth } from "@/lib/queries/month";
import { eurosToCents } from "@/lib/money";
import type { EmployeeExport } from "@/lib/export/pdf-template";

// selfRecorded wird in getMonth() abgeleitet; createdById verlaesst die
// Query-Schicht nicht (US-08, Kritisch).

export async function buildEmployeeExport(
  userId: string,
  ym: string,
): Promise<EmployeeExport | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "EMPLOYEE") return null;
  const { entries, totalMinutes } = await getMonth(userId, ym);
  return {
    name: user.name,
    ym,
    entries,
    totalMinutes,
    hourlyRateCents: eurosToCents(user.hourlyRate.toString()),
  };
}

/** AK-3/AK-6: Sammel-Export. Aktive Mitarbeiter und alle mit Zeiten im Monat. */
export async function buildAllEmployeeExports(
  ym: string,
): Promise<EmployeeExport[]> {
  const users = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    orderBy: [{ name: "asc" }],
  });

  const out: EmployeeExport[] = [];
  for (const u of users) {
    const { entries, totalMinutes } = await getMonth(u.id, ym);
    if (!u.isActive && entries.length === 0) continue; // keine leeren Blaetter
    out.push({
      name: u.name,
      ym,
      entries,
      totalMinutes,
      hourlyRateCents: eurosToCents(u.hourlyRate.toString()),
    });
  }
  return out;
}
