import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

/** Mark specific notifications read, or — with `ids` omitted — everything. */
export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().uuid()).max(100).optional(),
});
