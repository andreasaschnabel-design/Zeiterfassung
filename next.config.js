/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // puppeteer-core und @sparticuz/chromium duerfen NICHT gebundlet werden
  // (native Teile/Binary). Als externe Server-Pakete belassen.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  // US-15 ergänzt hier `outputFileTracingIncludes` für die PDF-Schriften
  // (assets/fonts) auf der Export-Route.
};

module.exports = nextConfig;
