import { requireExportReady } from "@/lib/export/ready";
import { buildCollectiveCsv, buildMonthCsv } from "@/lib/export/csv";
import { buildAllEmployeeExports, buildEmployeeExport } from "@/lib/export/data";
import { collectiveFileName, exportFileName } from "@/lib/export/filename";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ month: string }> },
) {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return new Response("Ungueltiger Monat.", { status: 400 });
  }

  const ready = await requireExportReady();
  if (!ready.ready) {
    return new Response(
      "Firmenname (employerName) fehlt. Bitte zuerst in den Einstellungen setzen.",
      { status: 400 },
    );
  }

  const userId = new URL(req.url).searchParams.get("userId");
  let csv: string;
  let filename: string;

  if (userId) {
    const emp = await buildEmployeeExport(userId, month); // AK-5: je Mitarbeiter
    if (!emp) return new Response("Mitarbeiter nicht gefunden.", { status: 404 });
    csv = buildMonthCsv(emp.entries);
    filename = exportFileName(emp.name, month, "csv");
  } else {
    const employees = await buildAllEmployeeExports(month); // AK-6: Sammel-CSV
    csv = buildCollectiveCsv(
      employees.map((e) => ({ name: e.name, entries: e.entries })),
    );
    filename = collectiveFileName(month, "csv");
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
