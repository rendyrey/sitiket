import { z } from "zod";

export const applyAdminSchema = z.object({
  businessName: z.string().min(2).max(255),
  businessDescription: z.string().max(2000).optional(),
  contactPhone: z.string().min(6).max(32),
});

export const decideAdminApplicationSchema = z.object({
  reviewNotes: z.string().max(2000).optional(),
});

export const listAdminApplicationsQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
