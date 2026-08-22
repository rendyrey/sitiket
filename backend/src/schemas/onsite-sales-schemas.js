import { z } from "zod";

export const recordOnsiteSaleSchema = z.object({
  ticketTypeId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10000),
  unitPrice: z.number().int().min(0).max(1_000_000_000).optional(),
  note: z.string().max(255).optional(),
});
