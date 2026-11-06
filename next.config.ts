import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Room for a poster upload in the "Submit an event" form. Kept under
      // Vercel's 4.5 MB request limit; big photos are shrunk in the browser.
      bodySizeLimit: "4mb",
    },
  },
  // Old links from before schools existed (they were all Concordia).
  async redirects() {
    return [{ source: "/submit", destination: "/concordia/submit", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
