const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const apiOrigin = new URL(process.env.API_BASE_URL ?? "http://localhost:4000");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Event posters/gallery images and payment-proof uploads are served from
    // the backend's local disk storage under /uploads — see BACKEND.md.
    remotePatterns: [
      {
        protocol: apiOrigin.protocol.replace(":", ""),
        hostname: apiOrigin.hostname,
        port: apiOrigin.port,
        pathname: "/uploads/**",
      },
    ],
  },
};

module.exports = withBundleAnalyzer(nextConfig);
