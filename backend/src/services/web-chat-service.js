import * as usersRepository from "../repositories/users-repository.js";
import { HttpError, notImplemented } from "../utils/http-error.js";
import { checkFlood, isAssistantConfigured, runAssistantTurn, runExclusive } from "./assistant-service.js";

// Website channel of the SiTIKET assistant (the in-app chat widget). Same
// engine and MCP tools as the WhatsApp bot; identity comes from the site's
// session instead of a phone number: a signed-in user acts as their own
// account (and as admin/super_admin when that is their role), a guest can
// only ask questions — every account-bound tool answers SIGN_IN_REQUIRED.

/** Staff roles that unlock reviewer tools, exactly as on WhatsApp. */
const STAFF_ROLES = ["admin", "super_admin"];

/**
 * One chat turn for the website.
 *
 * @param {{ sub: string } | null} requester - `request.user` from optionalAuth; `null` for a guest
 * @param {{ chatId: string, text: string }} input - validated by schemas/chat-schemas.js
 * @returns {Promise<{ reply: string, attachments: Array<{ type: "image", url: string, caption: string }>, signedIn: boolean }>}
 * @throws {HttpError} 501 when the LLM isn't configured, 429 when the chat is flooding
 */
export const sendMessage = async (requester, { chatId, text }) => {
  if (!isAssistantConfigured()) throw notImplemented("CHAT_NOT_CONFIGURED", "The chat assistant is not configured on this server");

  // Re-read the account: the JWT's role claim can be stale (see BACKEND.md § Known gaps).
  const user = requester ? await usersRepository.findById(requester.sub) : null;
  const account = user?.status === "active" ? user : undefined;
  const role = account && STAFF_ROLES.includes(account.role) ? account.role : "buyer";
  /** History/flood key — the account for signed-in users, the browser's chat id for guests. */
  const chatKey = account ? `web:${account.id}` : `web-guest:${chatId}`;

  if (checkFlood(chatKey) !== "answer") {
    throw new HttpError(429, "CHAT_RATE_LIMITED", "Pesannya banyak sekali dalam waktu singkat, Kak. Tunggu beberapa menit lalu coba lagi, ya 🙏");
  }

  const context = { channel: "web", role, staff: role === "buyer" ? undefined : account, account };
  const { reply, attachments } = await runExclusive(chatKey, () => runAssistantTurn({ chatKey, context, text }));
  return { reply, attachments, signedIn: Boolean(account) };
};
