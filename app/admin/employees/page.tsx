import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries/settings";
import { formatCents, eurosToCents } from "@/lib/money";
import { CreateEmployeeForm } from "./create-form";

// US-10/AK-1 + AK-2: Liste aller Mitarbeiter + Anlegen.
export default async function EmployeesPage() {
  await requireAdmin(); // AK-7

  const [employees, settings] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    getSettings(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold">Mitarbeiter</h1>
        <Link href="/admin" className="text-sm text-blue-700 underline">
          Zum Adminbereich
        </Link>
      </div>

      {/* AK-1: Name, E-Mail, Satz, Limit, Status */}
      <section className="mb-10">
        {employees.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-300 p-6 text-gray-600">
            Noch keine Mitarbeiter angelegt.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">E-Mail</th>
                  <th className="py-2 pr-4">Satz</th>
                  <th className="py-2 pr-4">Limit (h)</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="py-2 pr-4 font-medium">{e.name}</td>
                    <td className="py-2 pr-4">{e.email}</td>
                    <td className="py-2 pr-4">
                      {formatCents(eurosToCents(e.hourlyRate.toString()))}
                    </td>
                    <td className="py-2 pr-4">{Number(e.monthlyLimitHours)}</td>
                    <td className="py-2 pr-4">
                      {/* Status als Text, nicht nur Farbe (Barrierefreiheit) */}
                      {e.isActive ? (
                        <span className="text-green-700">aktiv</span>
                      ) : (
                        <span className="text-gray-500">inaktiv</span>
                      )}
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/admin/employees/${e.id}`}
                        className="text-blue-700 underline"
                      >
                        Bearbeiten
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Neuen Mitarbeiter anlegen</h2>
        <CreateEmployeeForm earningsLimit={settings.earningsLimit} />
      </section>
    </main>
  );
}
