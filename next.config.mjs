/**
 * Phase 1 is a static site: every page is written at build time and every
 * number is fetched by the visitor's browser from Hyperliquid
 * (docs/hlcharts-website.md §3). No server code, so `output: 'export'`.
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
