import type { NextConfig } from "next";

// Static export: the site is a fully static demo (21 project pages via generateStaticParams,
// no API routes) and ships to Cloudflare Pages by direct upload (scripts/deploy.sh).
const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  output: "export",
  images: { unoptimized: true },
  // tsc runs separately (npm run lint / tsc --noEmit); skipping it here keeps deploys fast on a loaded box
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
