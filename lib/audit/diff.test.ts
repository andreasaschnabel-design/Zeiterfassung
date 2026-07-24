import { describe, it, expect } from "vitest";
import { diffEntry } from "./diff";
import type { TimeEntrySnapshot } from "./snapshot";

function snap(overrides: Partial<TimeEntrySnapshot> = {}): TimeEntrySnapshot {
  return {
    workDate: "2026-07-24",
    startTime: "09:00",
    endTime: "17:00",
    breakMinutes: 30,
    durationMinutes: 450,
    note: null,
    ...overrides,
  };
}

describe("diffEntry", () => {
  it("liefert null bei Nulländerung (kein Protokollrauschen)", () => {
    expect(diffEntry(snap(), snap())).toBeNull();
  });

  it("erfasst nur geaenderte Felder", () => {
    const before = snap();
    const after = snap({ endTime: "18:00", durationMinutes: 510 });
    const diff = diffEntry(before, after);
    expect(diff).not.toBeNull();
    expect(diff!.old).toEqual({ endTime: "17:00", durationMinutes: 450 });
    expect(diff!.new).toEqual({ endTime: "18:00", durationMinutes: 510 });
    expect("startTime" in diff!.old).toBe(false);
  });

  it("erkennt eine entfernte Notiz (text -> null)", () => {
    const diff = diffEntry(snap({ note: "war da" }), snap({ note: null }));
    expect(diff!.old).toEqual({ note: "war da" });
    expect(diff!.new).toEqual({ note: null });
  });

  it("erkennt eine hinzugefuegte Notiz (null -> text)", () => {
    const diff = diffEntry(snap({ note: null }), snap({ note: "neu" }));
    expect(diff!.old).toEqual({ note: null });
    expect(diff!.new).toEqual({ note: "neu" });
  });
});
