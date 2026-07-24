/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // US-15 ergänzt hier `outputFileTracingIncludes` für die PDF-Schriften.
  // Kein Vorgriff: solange es keine Export-Route gibt, bleibt die Config leer.
};

module.exports = nextConfig;
