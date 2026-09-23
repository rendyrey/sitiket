import { z } from "zod";

// Server-only module: reads process.env.API_BASE_URL, which is not exposed to
// the client bundle. Only import this from Server Components, Route
// Handlers, or Server Actions.

const envSchema = z.object({
  API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
});

const parsed = envSchema.safeParse({
  API_BASE_URL: process.env.API_BASE_URL,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
}

/** Validated server-side environment — see `.env.example` for the full list. */
export const env = parsed.data;
