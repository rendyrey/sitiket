import { z } from "zod";

/**
 * Self-service profile update — contact + delivery address. The address is
 * a prerequisite for merch checkout (it becomes the order's shipping
 * snapshot); everything else about the account still comes from Google.
 */
export const updateProfileSchema = z
  .object({
    phone: z.string().min(6).max(32),
    address: z.string().min(5).max(500),
    city: z.string().max(120),
    province: z.string().max(120),
    postalCode: z.string().max(20),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

export const googleLoginSchema = z.object({
  idToken: z.string().min(10, "idToken looks too short to be a real Google ID token"),
});
