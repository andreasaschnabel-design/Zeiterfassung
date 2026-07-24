import Link from "next/link";
import { requireEmployeeTarget } from "@/lib/auth/guard";
import { getSettings } from "@/lib/queries/settings";
import { wageWarnings } from "@/lib/employees/warnings";
import { setEmployeeActive } from "../actions";
import { EditEmployeeForm } from "./edit-form";

// US-10/AK-4 + AK-5: Stammdaten bearbeiten, deaktivieren/aktivieren.
export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Laedt + prueft EMPLOYEE (Admin-Konten sind hier nicht adressierbar).
  const employee = await requireEmployeeTarget(id);
  const settings = await getSettings();

  const hourlyRate = Number(employee.hourlyRate).toFixed(2);
  const monthlyLimitHours = String(Number(employee.monthlyLimitHours));

  // Warnungen serverseitig — warnen, nicht blockieren (Kritisch).
  const warnings = wageWarnings({
    hourlyRate,
    monthlyLimitHours: Number(employee.monthlyLimitHours),
    minimumWage: settings.minimumWage,
    earningsLimit: settings.earningsLimit,
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/employees" className="text-sm text-blue-700 underline">
          ← Zur Mitarbeiterliste
        </Link>
      </div>

      <h1 className="text-2xl font-semibold">{employee.name}</h1>
      <p className="mt-1 text-gray-600">
        Status: {employee.isActive ? "aktiv" : "inaktiv"}
      </p>

      {warnings.length > 0 ? (
        <div
          role="status"
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p className="mb-1 font-medium">Hinweise</p>
          <ul className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="mt-8">
        <EditEmployeeForm
          employee={{
            id: employee.id,
            name: employee.name,
            email: employee.email,
            hourlyRate,
            monthlyLimitHours,
          }}
        />
      </section>

      <section className="mt-10 border-t pt-6">
        <h2 className="mb-2 text-lg font-semibold">
          {employee.isActive ? "Deaktivieren" : "Aktivieren"}
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          {employee.isActive
            ? "Deaktivierte Mitarbeiter koennen sich nicht anmelden. Zeiteintraege bleiben erhalten."
            : "Aktiviert den Zugang wieder."}
        </p>
        <form action={setEmployeeActive}>
          <input type="hidden" name="id" value={employee.id} />
          <input
            type="hidden"
            name="active"
            value={employee.isActive ? "false" : "true"}
          />
          <button
            type="submit"
            className="min-h-12 rounded-md border border-gray-300 px-4 text-base font-medium"
          >
            {employee.isActive ? "Mitarbeiter deaktivieren" : "Mitarbeiter aktivieren"}
          </button>
        </form>
      </section>
    </main>
  );
}
