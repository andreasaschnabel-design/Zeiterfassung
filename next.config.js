/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // puppeteer-core und @sparticuz/chromium duerfen NICHT gebundlet werden
  // (native Teile/Binary). Als externe Server-Pakete belassen.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  // US-15 (Kritisch): Die PDF-Schriften (assets/fonts) muessen in die
  // Serverless-Funktion der Export-Routen wandern — sonst fehlen sie in
  // Produktion. In Next.js 15 steht die Option top-level (nicht mehr unter
  // `experimental` wie im Deployment-Runbook fuer Next 14 notiert).
  outputFileTracingIncludes: {
    "/api/export/**": ["./assets/fonts/**"],
  },
};

module.exports = nextConfig;
