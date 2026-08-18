import { z } from "zod";

// Custom SMTP only — Gmail organizers connect via OAuth instead
// (POST /email-config/google), so no Gmail credential variant exists here.
export const saveEmailConfigSchema = z.object({
  provider: z.literal("custom"),
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
  fromName: z.string().min(2).max(255).optional(),
  host: z.string().min(1).max(255),
  port: z.coerce.number().int().positive().max(65535),
  secure: z.boolean().optional(),
});

// The authorization code from Google's consent redirect. redirectUri must
// exactly match the one the frontend used to start the flow — Google
// re-validates it during the code exchange.
export const connectGoogleEmailSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
});
