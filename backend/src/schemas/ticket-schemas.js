import { z } from "zod";

export const scanTicketSchema = z.object({
  qrPayload: z.string().min(1),
  deviceLabel: z.string().max(255).optional(),
});
