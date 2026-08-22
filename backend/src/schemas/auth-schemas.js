import { z } from "zod";

/**
 * Self-service profile update — contact + delivery address. The address is
 * a prerequisite for merch checkout (it becomes the order's shipping
 * snapshot); everything else about the account still comes from Google.
 *
 * The region is chosen as a 10-digit api.co.id village code — the server
 * resolves the full hierarchy (province/city/district/village names + codes)
 * from it, so region names are never free-typed. `postalCode` must be one of
 * the chosen village's own postal codes.
 */
export const updateProfileSchema = z
  .object({
    phone: z.string().min(6).max(32),
    address: z.string().min(5).max(500),
    villageCode: z.string().regex(/^\d{10}$/, "villageCode must be a 10-digit village code"),
    postalCode: z.string().max(20),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

export const googleLoginSchema = z.object({
  idToken: z.string().min(10, "idToken looks too short to be a real Google ID token"),
});
