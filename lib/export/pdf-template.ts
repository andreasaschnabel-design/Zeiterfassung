import type { MonthEntry } from "@/lib/queries/month";
import { formatDecimalHours } from "@/lib/time/core";
import { formatCents, grossPay } from "@/lib/money";

// US-08: Prueffeste Monatsnachweis-Vorlage nach § 17 MiLoG. Nuechtern — kein
// Logo, keine Farben (wird ausgedruckt und einem Pruefer vorgelegt).
//
// US-15 ergaenzt hier @font-face mit Base64-DejaVuSans (statt CDN), damit der
// Nachweis auch serverless lesbaren Text statt leerer Kaestchen zeigt. Der
// INHALT bleibt dabei unveraendert (US-15/AK-6).

export type EmployeeExport = {
  name: string;
  ym: string; // "YYYY-MM"
  entries: MonthEntry[];
  totalMinutes: number;
  hourlyRateCents: number;
};

// US-08 (Kritisch): HTML-Escaping fuer freien Nutzertext (name, note).
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function section(employerName: string, emp: EmployeeExport): string {
  const rows = emp.entries
    .map(
      (e) => `
        <tr>
          <td>${e.workDate}</td>
          <td>${e.startTime}</td>
          <td>${e.endTime}</td>
          <td>${e.breakMinutes} min</td>
          <td class="num">${formatDecimalHours(e.durationMinutes)}</td>
          <td>${e.selfRecorded ? "Mitarbeiter" : "Arbeitgeber"}</td>
          <td>${esc(e.note ?? "")}</td>
        </tr>`,
    )
    .join("");

  // Bruttolohn NACHRICHTLICH: eine Rundung am Ende, ueber Cent.
  const gross = grossPay(emp.totalMinutes, emp.hourlyRateCents);

  return `
    <section class="sheet">
      <h1>Arbeitszeitnachweis</h1>
      <table class="meta">
        <tr><th>Arbeitgeber</th><td>${esc(employerName)}</td></tr>
        <tr><th>Mitarbeiter/in</th><td>${esc(emp.name)}</td></tr>
        <tr><th>Abrechnungszeitraum</th><td>${emp.ym}</td></tr>
      </table>

      <table class="entries">
        <thead>
          <tr>
            <th>Datum</th><th>Beginn</th><th>Ende</th><th>Pause</th>
            <th class="num">Dauer (Std)</th><th>Erfasst durch</th><th>Notiz</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="7" class="empty">Keine Zeiten in diesem Monat erfasst.</td></tr>`}</tbody>
        <tfoot>
          <tr>
            <th colspan="4">Summe</th>
            <th class="num">${formatDecimalHours(emp.totalMinutes)}</th>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>

      <p class="gross">
        Bruttoentgelt (nachrichtlich, nicht Teil der Lohnabrechnung):
        <strong>${formatCents(gross)}</strong>
      </p>

      <div class="signatures">
        <div><span class="line"></span>Unterschrift Mitarbeiter/in</div>
        <div><span class="line"></span>Unterschrift Arbeitgeber</div>
      </div>

      <p class="legal">
        Aufzeichnung nach § 17 Abs. 1 MiLoG (Beginn, Ende und Dauer der
        taeglichen Arbeitszeit). Aufzubewahren mindestens zwei Jahre.
      </p>
    </section>`;
}

export function renderExportHtml(params: {
  employerName: string;
  generatedAt: string; // vorformatierter Zeitstempel (Europe/Berlin)
  employees: EmployeeExport[];
}): string {
  const body = params.employees
    .map((emp) => section(params.employerName, emp))
    .join('<div class="page-break"></div>');

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  /* US-15: hier @font-face DejaVuSans (Base64) ergaenzen. */
  * { box-sizing: border-box; }
  body { font-family: "DejaVu Sans", Arial, sans-serif; color: #000; font-size: 11px; margin: 24px; }
  h1 { font-size: 16px; margin: 0 0 12px; }
  table { border-collapse: collapse; width: 100%; }
  table.meta { margin-bottom: 12px; width: auto; }
  table.meta th { text-align: left; padding: 2px 12px 2px 0; font-weight: 700; white-space: nowrap; }
  table.meta td { padding: 2px 0; }
  table.entries th, table.entries td { border: 1px solid #000; padding: 3px 6px; text-align: left; }
  table.entries thead th, table.entries tfoot th { background: #eee; }
  .num { text-align: right; }
  .empty { text-align: center; font-style: italic; }
  .gross { margin: 12px 0 24px; }
  .signatures { display: flex; gap: 48px; margin-top: 48px; }
  .signatures div { flex: 1; font-size: 10px; }
  .signatures .line { display: block; border-top: 1px solid #000; margin-bottom: 4px; height: 32px; }
  .legal { margin-top: 24px; font-size: 9px; color: #333; }
  .page-break { page-break-after: always; }
  footer { margin-top: 16px; font-size: 9px; color: #333; }
</style>
</head>
<body>
  ${body}
  <footer>Erstellt am ${esc(params.generatedAt)}</footer>
</body>
</html>`;
}
