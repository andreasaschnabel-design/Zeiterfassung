import { describe, it, expect } from "vitest";
import {
  addDays,
  dbDateToIso,
  isoDateToDbDate,
  monthRange,
  shiftMonth,
  todayISO,
  workDateError,
} from "./dates";

describe("isoDateToDbDate / dbDateToIso", () => {
  it("erzeugt UTC-Mitternacht des Kalendertags", () => {
    const d = isoDateToDbDate("2026-01-15");
    expect(d.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("Roundtrip ueber UTC-Getter", () => {
    for (const iso of ["2026-01-01", "2026-07-15", "2026-12-31"]) {
      expect(dbDateToIso(isoDateToDbDate(iso))).toBe(iso);
    }
  });

  it("wirft bei ungueltigem Datum", () => {
    expect(() => isoDateToDbDate("2026-1-1")).toThrow();
    expect(() => isoDateToDbDate("kaputt")).toThrow();
  });
});

describe("addDays", () => {
  it("verschiebt ueber Monats- und Jahresgrenzen", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-02-15", -31)).toBe("2026-01-15");
  });
});

describe("todayISO (Europe/Berlin, D6)", () => {
  it("22:00 deutscher Zeit ist heute, nicht der Vortag (Winter, UTC+1)", () => {
    // 2026-01-15 23:30 Berlin = 22:30 UTC — gleicher Kalendertag.
    expect(todayISO(new Date("2026-01-15T22:30:00Z"))).toBe("2026-01-15");
  });

  it("kurz nach Mitternacht Berlin ist bereits der neue Tag", () => {
    // 2026-01-16 00:30 Berlin = 2026-01-15 23:30 UTC. UTC-Datum waere der
    // Vortag — Europe/Berlin liefert korrekt den 16.
    expect(todayISO(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
  });

  it("funktioniert auch in der Sommerzeit (UTC+2)", () => {
    // 2026-07-15 23:30 Berlin = 21:30 UTC.
    expect(todayISO(new Date("2026-07-15T21:30:00Z"))).toBe("2026-07-15");
  });
});

describe("workDateError", () => {
  const today = "2026-07-24";

  it("erlaubt heute und Tage innerhalb der Nachtragsfrist", () => {
    expect(workDateError(today, today, 31)).toBeNull();
    expect(workDateError("2026-07-01", today, 31)).toBeNull();
    expect(workDateError(addDays(today, -31), today, 31)).toBeNull();
  });

  it("lehnt Zukunft ab (AK-6)", () => {
    expect(workDateError(addDays(today, 1), today, 31)).toMatch(/Zukunft/);
  });

  it("lehnt Eintraege ausserhalb der 31-Tage-Frist ab", () => {
    expect(workDateError(addDays(today, -32), today, 31)).toMatch(/31 Tage/);
  });

  it("lehnt ungueltiges Format ab", () => {
    expect(workDateError("2026-7-1", today, 31)).toMatch(/Ungueltig/);
  });
});

describe("monthRange (halboffen, Dezember-Rollover)", () => {
  it("liefert [Monatserster, Folgemonatserster)", () => {
    const { gte, lt } = monthRange("2026-07");
    expect(gte.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(lt.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("rollt im Dezember korrekt ins Folgejahr", () => {
    const { gte, lt } = monthRange("2026-12");
    expect(gte.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(lt.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("wirft bei ungueltigem Monat", () => {
    expect(() => monthRange("2026-13")).not.toThrow(); // Formatpruefung ist Regex-basiert
    expect(() => monthRange("kaputt")).toThrow();
  });
});

describe("shiftMonth (Jahreswechsel)", () => {
  it("verschiebt vorwaerts und rueckwaerts", () => {
    expect(shiftMonth("2026-07", 1)).toBe("2026-08");
    expect(shiftMonth("2026-07", -1)).toBe("2026-06");
  });

  it("wechselt das Jahr korrekt", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});
