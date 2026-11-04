import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Let the dev server be opened by IP (127.0.0.1) and from phones on the home network.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
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
