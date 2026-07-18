import { z } from "zod";

const baseFields = {
  name: z.string().min(2).max(255),
  description: z.string().min(1),
  categoryId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  venueName: z.string().max(255).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
  province: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  meetingUrl: z.string().url().optional(),
  meetingPlatform: z.enum(["zoom", "google_meet", "other"]).optional(),
  contactPersonName: z.string().min(2).max(255),
  contactPersonEmail: z.string().email(),
  contactPersonPhone: z.string().min(6).max(32),
  bankAccountId: z.string().uuid().optional(),
  maxTicketsPerUser: z.coerce.number().int().positive().max(1000).optional(),
};

const validateDateOrder = (data, ctx) => {
  if (data.endDate < data.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "endDate must be on or after startDate" });
  }
};

export const createEventSchema = z.object(baseFields).superRefine(validateDateOrder);

export const updateEventSchema = z
  .object(baseFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) validateDateOrder(data, ctx);
  });

export const changeEventStatusSchema = z.object({
  status: z.enum(["draft", "published", "cancelled", "completed"]),
});

export const setEventVisibilitySchema = z.object({
  isVisible: z.boolean(),
});

export const listEventsQuerySchema = z.object({
  category: z.string().optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
