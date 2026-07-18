import { z } from "zod";

// multer populates req.body text fields as strings even for a boolean-shaped field.
export const uploadEventImageSchema = z.object({
  isPoster: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});
