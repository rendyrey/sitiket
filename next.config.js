const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

// The browser loads /uploads assets from the PUBLIC asset origin
// (NEXT_PUBLIC_API_ORIGIN), which in production differs from the internal
// server-to-server API_BASE_URL (e.g. http://127.0.0.1:4000). The Image
// allowlist must match where the browser actually fetches, so derive it here.
const assetOrigin = new URL(process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Event posters/gallery images and payment-proof uploads are served from
    // the backend's local disk storage under /uploads — see BACKEND.md.
    remotePatterns: [
      {
        protocol: assetOrigin.protocol.replace(":", ""),
        hostname: assetOrigin.hostname,
        port: assetOrigin.port,
        pathname: "/uploads/**",
      },
    ],
  },
};

module.exports = withBundleAnalyzer(nextConfig);
