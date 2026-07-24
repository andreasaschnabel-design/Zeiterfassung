import { describe, it, expect } from "vitest";
import type { MonthEntry } from "@/lib/queries/month";
import { renderExportHtml, type EmployeeExport } from "./pdf-template";

function entry(overrides: Partial<MonthEntry> = {}): MonthEntry {
  return {
    id: "e1",
    workDate: "2026-07-10",
    startTime: "09:00",
    endTime: "17:00",
    breakMinutes: 30,
    durationMinutes: 450,
    note: null,
    selfRecorded: true,
    ...overrides,
  };
}

function emp(overrides: Partial<EmployeeExport> = {}): EmployeeExport {
  return {
    name: "Anna Weiß",
    ym: "2026-07",
    entries: [entry()],
    totalMinutes: 2400,
    hourlyRateCents: 1390,
    ...overrides,
  };
}

describe("renderExportHtml (§ 17 MiLoG)", () => {
  const html = renderExportHtml({
    employerName: "Muster GmbH",
    generatedAt: "24.07.2026, 14:30 Uhr",
    employees: [emp()],
  });

  it("enthaelt Pflichtangaben: Arbeitgeber, Mitarbeiter, Zeitraum, § 17, Aufbewahrung", () => {
    expect(html).toContain("Muster GmbH");
    expect(html).toContain("2026-07");
    expect(html).toContain("§ 17");
    expect(html).toMatch(/zwei Jahre/i);
    expect(html).toContain("Erstellt am 24.07.2026, 14:30 Uhr");
  });

  it("weist den Bruttolohn NACHRICHTLICH aus (40 Std x 13,90 = 556,00 €)", () => {
    expect(html).toContain("nachrichtlich");
    expect(html).toContain("556,00 €");
  });

  it("hat eine Erfassungsspalte und Unterschriftsfelder", () => {
    expect(html).toContain("Erfasst durch");
    expect(html).toContain("Unterschrift Mitarbeiter/in");
    expect(html).toContain("Unterschrift Arbeitgeber");
  });

  it("escaped freien Nutzertext (name, note)", () => {
    const evil = renderExportHtml({
      employerName: "X",
      generatedAt: "x",
      employees: [
        emp({ name: "<script>", entries: [entry({ note: "a<b & c\"" })] }),
      ],
    });
    expect(evil).not.toContain("<script>");
    expect(evil).toContain("&lt;script&gt;");
    expect(evil).toContain("a&lt;b &amp; c&quot;");
  });

  it("trennt mehrere Mitarbeiter mit einem Seitenumbruch", () => {
    const multi = renderExportHtml({
      employerName: "X",
      generatedAt: "x",
      employees: [emp({ name: "A" }), emp({ name: "B" })],
    });
    expect(multi).toContain("page-break");
  });

  it("bettet uebergebenes @font-face-CSS ein (US-15)", () => {
    const withFont = renderExportHtml({
      employerName: "X",
      generatedAt: "x",
      employees: [emp()],
      fontFaceCss: "@font-face{font-family:'DejaVu Sans';src:url(data:font/ttf;base64,AAA)}",
    });
    expect(withFont).toContain("@font-face");
    expect(withFont).toContain("data:font/ttf;base64,AAA");
  });
});
