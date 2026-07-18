import { z } from "zod";

export const listUsersQuerySchema = z.object({
  role: z.enum(["user", "admin", "super_admin"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});
