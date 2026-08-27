import { z } from "zod";

// Body arrives as multipart/form-data (the QRIS image rides along as a file),
// so every field is a string — same constraint as event-image-schemas.js.
export const saveQrisConfigSchema = z.object({
  merchantName: z.string().min(2).max(255),
});

// Plain JSON PATCH (no file), so real booleans are fine here.
export const updateQrisConfigSchema = z
  .object({
    showOnTicketCheckout: z.boolean(),
    showOnMerchCheckout: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
