import Link from "next/link";
import { requireAdminEntryAccess } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { dbDateToIso } from "@/lib/time/dates";
import { AdminEditEntryForm } from "./admin-edit-entry-form";

// US-07: Admin korrigiert einen beliebigen Eintrag (ohne Monatsbeschraenkung,
// ohne Karenzfrist).
export default async function AdminEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { entry } = await requireAdminEntryAccess(id);
  const workDate = dbDateToIso(entry.workDate);
  const employee = await prisma.user.findUnique({
    where: { id: entry.userId },
    select: { name: true },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/admin/employees/${entry.userId}?month=${workDate.slice(0, 7)}`}
          className="text-sm text-blue-700 underline"
        >
          ← Zurueck zu {employee?.name ?? "Mitarbeiter"}
        </Link>
      </div>

      <h1 className="text-2xl font-semibold">
        Eintrag korrigieren — {workDate}
      </h1>
      <p className="mt-1 text-gray-600">{employee?.name}</p>

      <div className="mt-6">
        <AdminEditEntryForm
          entry={{
            id: entry.id,
            workDate,
            startTime: entry.startTime,
            endTime: entry.endTime,
            breakMinutes: entry.breakMinutes,
            note: entry.note,
          }}
        />
      </div>
    </main>
  );
}
