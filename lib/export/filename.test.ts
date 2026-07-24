import { describe, it, expect } from "vitest";
import { collectiveFileName, exportFileName, safeFileNamePart } from "./filename";

describe("safeFileNamePart (Transliteration VOR NFD)", () => {
  it("macht aus 'Weiß' -> 'Weiss', nicht 'Wei'", () => {
    expect(safeFileNamePart("Weiß")).toBe("Weiss");
  });

  it("transliteriert Umlaute zu ae/oe/ue (nicht a/o/u)", () => {
    expect(safeFileNamePart("Müller")).toBe("Mueller");
    expect(safeFileNamePart("Öztürk")).toBe("Oeztuerk");
    expect(safeFileNamePart("Ärger")).toBe("Aerger");
  });

  it("zerlegt sonstige Akzente ueber NFD", () => {
    expect(safeFileNamePart("José")).toBe("Jose");
    expect(safeFileNamePart("Renée")).toBe("Renee");
  });

  it("ersetzt Trenner und faellt auf 'Unbekannt' zurueck", () => {
    expect(safeFileNamePart("Anna Weiß")).toBe("Anna_Weiss");
    expect(safeFileNamePart("###")).toBe("Unbekannt");
    expect(safeFileNamePart("")).toBe("Unbekannt");
  });
});

describe("Dateinamen", () => {
  it("baut Einzel- und Sammelnamen", () => {
    expect(exportFileName("Anna Weiß", "2026-07", "pdf")).toBe(
      "Zeitnachweis_Anna_Weiss_2026-07.pdf",
    );
    expect(collectiveFileName("2026-07", "csv")).toBe(
      "Zeitnachweise_alle_2026-07.csv",
    );
  });
});
