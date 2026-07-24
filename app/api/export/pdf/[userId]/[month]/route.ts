import { requireExportReady } from "@/lib/export/ready";
import { renderExportHtml } from "@/lib/export/pdf-template";
import { renderHtmlToPdf } from "@/lib/export/pdf";
import { loadFontFaceCss } from "@/lib/export/fonts";
import { buildAllEmployeeExports, buildEmployeeExport } from "@/lib/export/data";
import { collectiveFileName, exportFileName } from "@/lib/export/filename";
import { berlinTimestamp } from "@/lib/time/dates";

// US-15: Node-Runtime, laengeres Zeitlimit (memory=1024 in vercel.json).
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string; month: string }> },
) {
  const { userId, month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return new Response("Ungueltiger Monat.", { status: 400 });
  }

  // AK-4 + employerName-Pflicht.
  const ready = await requireExportReady();
  if (!ready.ready) {
    return new Response(
      "Firmenname (employerName) fehlt. Bitte zuerst in den Einstellungen setzen.",
      { status: 400 },
    );
  }

  const generatedAt = berlinTimestamp();
  let employees;
  let filename;

  if (userId === "all") {
    employees = await buildAllEmployeeExports(month); // AK-3: Sammel-Export
    filename = collectiveFileName(month, "pdf");
  } else {
    const emp = await buildEmployeeExport(userId, month);
    if (!emp) return new Response("Mitarbeiter nicht gefunden.", { status: 404 });
    employees = [emp];
    filename = exportFileName(emp.name, month, "pdf");
  }

  const html = renderExportHtml({
    employerName: ready.settings.employerName,
    generatedAt,
    employees,
    fontFaceCss: loadFontFaceCss(), // US-15: Base64-Schriften einbetten
  });
  const pdf = await renderHtmlToPdf(html);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
