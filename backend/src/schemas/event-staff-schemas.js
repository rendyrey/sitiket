import { z } from "zod";

export const inviteEventStaffSchema = z.object({
  email: z.string().email(),
});

export const respondStaffInvitationSchema = z.object({
  decision: z.enum(["accept", "decline"]),
});
