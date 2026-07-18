/**
 * `NEXT_PUBLIC_*` environment values — safe to read from Server or Client
 * Components alike (Next.js inlines these at build time). For anything
 * server-secret, use `lib/env.ts` instead.
 */
export const publicEnv = {
  /** Origin backend-served assets (event images, payment proofs) are loaded from directly by the browser. */
  apiOrigin: process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000",
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
};

/**
 * Resolves a backend-relative asset path (e.g. `"/uploads/x.jpg"`) into an
 * absolute URL the browser can load directly.
 */
export const toAssetUrl = (path: string): string => new URL(path, publicEnv.apiOrigin).toString();
