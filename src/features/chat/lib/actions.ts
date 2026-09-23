"use server";

import { toActionResult, type ActionResult } from "@/lib/api/action-result";
import { apiFetch } from "@/lib/api/client";
import type { ChatReply } from "./types";

/**
 * Sends one message to the website assistant (backend `POST /api/chat/messages`).
 * The session cookie is forwarded automatically, so a signed-in user chats as
 * their account; guests are keyed by `chatId`.
 *
 * @param chatId - the browser's chat id (UUID kept in localStorage). Example: `"0f8e…"`
 * @param text - the user's message. Example: `"event apa saja minggu ini?"`
 */
export async function sendChatMessageAction(chatId: string, text: string): Promise<ActionResult<ChatReply>> {
  return toActionResult(() => apiFetch<ChatReply>("/api/chat/messages", { method: "POST", body: { chatId, text } }));
}
