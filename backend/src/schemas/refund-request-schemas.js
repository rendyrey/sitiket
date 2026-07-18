import { z } from "zod";

export const requestRefundSchema = z.object({
  reason: z.string().min(5).max(2000),
  // Required only for guest (unauthenticated) requesters.
  guestEmail: z.string().email().optional(),
});

export const decideRefundRequestSchema = z.object({
  notes: z.string().max(2000).optional(),
});
