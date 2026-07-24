import { readFileSync } from "node:fs";
import { join } from "node:path";

// US-15 (Kritisch): Schriften als Base64 in der Vorlage, NICHT per CDN. Der
// Nachweis muss in Jahren noch erzeugbar sein. Ohne eingebettete Fonts rendert
// @sparticuz/chromium leere Kaestchen (D5).
//
// `outputFileTracingIncludes` in next.config.js sorgt dafuer, dass die
// .ttf-Dateien in der Serverless-Funktion vorhanden sind.

let cached: string | null = null;

function fontBase64(file: string): string {
  // process.cwd() ist die Projektwurzel; assets/fonts wird ueber
  // outputFileTracingIncludes mitgebundlet.
  const path = join(process.cwd(), "assets", "fonts", file);
  return readFileSync(path).toString("base64");
}

/** @font-face-CSS mit Base64-DejaVuSans (regular + bold). Einmal gecacht. */
export function loadFontFaceCss(): string {
  if (cached !== null) return cached;

  const regular = fontBase64("DejaVuSans.ttf");
  const bold = fontBase64("DejaVuSans-Bold.ttf");

  cached = `
    @font-face {
      font-family: "DejaVu Sans";
      font-style: normal;
      font-weight: 400;
      src: url(data:font/ttf;base64,${regular}) format("truetype");
    }
    @font-face {
      font-family: "DejaVu Sans";
      font-style: normal;
      font-weight: 700;
      src: url(data:font/ttf;base64,${bold}) format("truetype");
    }`;
  return cached;
}
