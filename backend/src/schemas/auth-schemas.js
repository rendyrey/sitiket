import { z } from "zod";

export const googleLoginSchema = z.object({
  idToken: z.string().min(10, "idToken looks too short to be a real Google ID token"),
});
