import { describe, it, expect } from "vitest";
import type { MonthEntry } from "@/lib/queries/month";
import { buildCollectiveCsv, buildMonthCsv } from "./csv";

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

describe("buildMonthCsv", () => {
  const csv = buildMonthCsv([entry()]);

  it("beginnt mit BOM", () => {
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("nutzt Semikolon, CRLF und Dezimalkomma", () => {
    expect(csv).toContain(";");
    expect(csv).toContain("\r\n");
    expect(csv).toContain("7,50"); // 450 min = 7,50 Std
  });

  it("hat die doppelte Dauerspalte (Std und Minuten)", () => {
    const header = csv.split("\r\n")[0];
    expect(header).toContain("Dauer (Std)");
    expect(header).toContain("Dauer (min)");
    const row = csv.split("\r\n")[1];
    expect(row).toContain("7,50");
    expect(row).toContain("450");
  });

  it("kennzeichnet die Erfassung (Mitarbeiter/Arbeitgeber)", () => {
    expect(buildMonthCsv([entry({ selfRecorded: true })])).toContain("Mitarbeiter");
    expect(buildMonthCsv([entry({ selfRecorded: false })])).toContain("Arbeitgeber");
  });

  it("hat KEINE Summenzeile", () => {
    const multi = buildMonthCsv([entry(), entry({ id: "e2" })]);
    expect(multi.toLowerCase()).not.toContain("summe");
    // Kopfzeile + 2 Datenzeilen (letzte Zeile leer wegen abschliessendem CRLF).
    const lines = multi.split("\r\n").filter((l) => l !== "");
    expect(lines).toHaveLength(3);
  });

  it("quotet Felder mit Semikolon in der Notiz", () => {
    const csv2 = buildMonthCsv([entry({ note: "Schicht; spaet" })]);
    expect(csv2).toContain('"Schicht; spaet"');
  });
});

describe("buildCollectiveCsv", () => {
  it("stellt die Spalte 'Mitarbeiter' voran", () => {
    const csv = buildCollectiveCsv([
      { name: "Anna", entries: [entry()] },
      { name: "Bea", entries: [entry({ id: "e2" })] },
    ]);
    expect(csv.split("\r\n")[0].startsWith("﻿Mitarbeiter;")).toBe(true);
    expect(csv).toContain("Anna");
    expect(csv).toContain("Bea");
  });
});
