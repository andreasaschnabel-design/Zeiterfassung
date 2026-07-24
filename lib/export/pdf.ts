// US-08: HTML -> PDF. Serverless-Pfad ueber puppeteer-core + @sparticuz/chromium.
//
// US-15 haertet das hier: `document.fonts.ready` abwarten und Base64-Schriften
// in der Vorlage. KEIN Browser-Singleton (Function-Instanzen sind isoliert) —
// der Browser wird pro Aufruf geoeffnet und im finally geschlossen.

export async function renderHtmlToPdf(html: string): Promise<Uint8Array> {
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = await import("puppeteer-core");

  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ?? (await chromium.executablePath());

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    // US-15 (Kritisch): document.fonts.ready abwarten. domcontentloaded/
    // networkidle feuern vor dem Font-Parsing — sonst rendert jeder zweite
    // Export in der Fallback-Schrift.
    await page.evaluate(async () => {
      await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts
        .ready;
    });
    const pdf = await page.pdf({
      format: "a4",
      printBackground: false,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
