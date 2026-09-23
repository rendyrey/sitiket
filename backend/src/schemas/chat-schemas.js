import { z } from "zod";

/** `POST /api/chat/messages` — one message to the website assistant. */
export const chatMessageSchema = z.object({
  // Browser-generated id of a guest's chat (kept in localStorage) — keys guest
  // history only; signed-in users are keyed by their account instead.
  chatId: z.string().uuid(),
  // Same cap as the assistant engine (MAX_USER_TEXT_LENGTH).
  text: z.string().trim().min(1).max(1500),
});
