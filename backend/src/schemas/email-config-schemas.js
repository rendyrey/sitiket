import { z } from "zod";

const shared = {
  email: z.string().email().max(255),
  // Gmail App Passwords are 16 characters; allow pasted variants with spaces.
  password: z.string().min(8).max(255),
  fromName: z.string().min(2).max(255).optional(),
};

// Gmail rows carry no host/port — the server applies the Gmail preset
// (smtp.gmail.com:465, TLS). Custom rows must spell the whole thing out.
export const saveEmailConfigSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("gmail"), ...shared }),
  z.object({
    provider: z.literal("custom"),
    ...shared,
    host: z.string().min(1).max(255),
    port: z.coerce.number().int().positive().max(65535),
    secure: z.boolean().optional(),
  }),
]);
