import { describe, it, expect } from "vitest";
import { buildChanges } from "./changes";

const full = {
  workDate: "2026-07-10",
  startTime: "09:00",
  endTime: "17:00",
  breakMinutes: 30,
  durationMinutes: 450,
  note: "Frueh",
};

describe("buildChanges — drei getrennte Faelle", () => {
  it("CREATE zeigt nur den neuen Zustand", () => {
    const changes = buildChanges("CREATE", null, full);
    expect(changes.every((c) => c.from === null)).toBe(true);
    const note = changes.find((c) => c.label === "Notiz");
    expect(note?.to).toBe("Frueh");
  });

  it("DELETE zeigt nur den alten (vollen) Zustand", () => {
    const changes = buildChanges("DELETE", full, null);
    expect(changes.every((c) => c.to === null)).toBe(true);
    expect(changes.find((c) => c.label === "Dauer")?.from).toBe("7:30 Std");
  });

  it("UPDATE zeigt geaenderte Felder alt -> neu", () => {
    const changes = buildChanges(
      "UPDATE",
      { endTime: "17:00", durationMinutes: 450 },
      { endTime: "18:00", durationMinutes: 510 },
    );
    const end = changes.find((c) => c.label === "Ende");
    expect(end).toEqual({ label: "Ende", from: "17:00", to: "18:00" });
  });

  it("entfernte Notiz (text -> null) wird als Aenderung gezeigt, NICHT als unveraendert", () => {
    // Kritisch: newV[f] ?? oldV[f] wuerde hier "Frueh" (unveraendert) zeigen.
    const changes = buildChanges("UPDATE", { note: "Frueh" }, { note: null });
    const note = changes.find((c) => c.label === "Notiz");
    expect(note).toEqual({ label: "Notiz", from: "Frueh", to: "(keine)" });
  });

  it("Pause auf 0 (30 -> 0) wird gezeigt, NICHT ueber || verschluckt", () => {
    // Kritisch: newV[f] || oldV[f] wuerde hier 30 (unveraendert) zeigen.
    const changes = buildChanges("UPDATE", { breakMinutes: 30 }, { breakMinutes: 0 });
    const pause = changes.find((c) => c.label === "Pause");
    expect(pause).toEqual({ label: "Pause", from: "30 min", to: "0 min" });
  });
});
