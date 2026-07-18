import { z } from "zod";

export const submitPaymentProofSchema = z.object({
  transferNote: z.string().max(500).optional(),
  // Required only for guest (unauthenticated) submissions — proves the
  // submitter knows the order's buyer email, standing in for a session.
  guestEmail: z.string().email().optional(),
});

export const decidePaymentProofSchema = z.object({
  reviewerNotes: z.string().max(2000).optional(),
});

export const getPaymentInstructionsQuerySchema = z.object({
  guestEmail: z.string().email().optional(),
});
