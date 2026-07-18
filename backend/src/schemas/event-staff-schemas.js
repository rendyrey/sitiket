import { z } from "zod";

export const inviteEventStaffSchema = z.object({
  email: z.string().email(),
});
