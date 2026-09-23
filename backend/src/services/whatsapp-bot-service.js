import { env } from "../config/env.js";
import * as usersRepository from "../repositories/users-repository.js";
import { toWhatsappId } from "../utils/phone.js";
import { appendExchange, checkFlood, isAssistantConfigured, runAssistantTurn, runExclusive } from "./assistant-service.js";
import { resolveSender } from "./chat-identity-service.js";
import { attachPaymentProof } from "./chat-proof-service.js";
import { downloadMedia, sendText } from "./whatsapp-client.js";

// WhatsApp channel of the SiTIKET assistant: reads inbound messages from the
// signed webhook (routes/whatsapp.js), resolves who is writing, answers text
// through the shared assistant engine (services/assistant-service.js → local
// MCP tools), and handles payment proof photos directly (no LLM involved).

/** Webhook message ids already handled (Meta can deliver one twice). */
const MAX_REMEMBERED_MESSAGE_IDS = 1000;

const ERROR_REPLY = "Maaf Kak, sistem kami sedang ada gangguan 🙏 Silakan coba lagi beberapa saat lagi, ya.";
const UNSUPPORTED_REPLY =
  "Maaf Kak, Mimin hanya bisa membaca pesan teks dan *foto* bukti pembayaran. Silakan ketik pertanyaannya atau kirim foto bukti transfer, ya.";
const RATE_LIMITED_REPLY = "Pesannya banyak sekali dalam waktu singkat, Kak. Tunggu beberapa menit lalu coba lagi, ya 🙏";

/** Insertion-ordered set of handled webhook message ids. */
const handledMessageIds = new Set();

/** @returns {boolean} true when every credential the bot needs is configured. */
export const isWhatsappBotConfigured = () =>
  Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID && isAssistantConfigured());

/**
 * @param {string} messageId - Example: `"wamid.HBgM…"`
 * @returns {boolean} true when this id was already handled
 */
const isDuplicate = (messageId) => {
  if (handledMessageIds.has(messageId)) return true;
  handledMessageIds.add(messageId);
  if (handledMessageIds.size > MAX_REMEMBERED_MESSAGE_IDS) handledMessageIds.delete(handledMessageIds.values().next().value);
  return false;
};

/**
 * Startup check: an admin/super_admin without a phone can't be recognised by
 * the bot, so say so loudly instead of letting their messages silently get
 * buyer treatment.
 */
export const warnStaffWithoutPhone = async () => {
  for (const role of ["super_admin", "admin"]) {
    const missing = (await usersRepository.listByRole(role)).filter((user) => toWhatsappId(user.phone).length < 8);
    for (const user of missing) {
      const fix = role === "super_admin" ? `npm run db:promote-super-admin -- ${user.email} <phone>` : "the profile page";
      console.warn(`[whatsapp-bot] ${role} ${user.email} has no phone number — the bot treats them as a buyer. Set it via ${fix}.`);
    }
  }
};

/** History/flood key of one WhatsApp chat. Example: `"wa:628112003717"` */
const chatKeyOf = (waId) => `wa:${waId}`;

/**
 * How this sender's guest ticket orders are tagged.
 * @param {string} waId
 * @returns {import("../repositories/orders-repository.js").BotIdentity}
 */
const botIdentityOf = (waId) => ({ column: "whatsapp_wa_id", value: waId });

/**
 * Answers a text message through the shared assistant engine.
 * @param {string} waId - Example: `"628112003717"`
 * @param {string} text - Example: `"event apa aja bulan ini?"`
 * @returns {Promise<string>} reply text
 */
const answerText = async (waId, text) => {
  const sender = await resolveSender(waId);
  const context = { channel: "whatsapp", waId, botIdentity: botIdentityOf(waId), verifiedPhone: waId, ...sender };
  const { reply } = await runAssistantTurn({ chatKey: chatKeyOf(waId), context, text });
  return reply;
};

/**
 * Attaches a WhatsApp photo to one of the sender's open orders as its payment
 * proof (services/chat-proof-service.js — shared with the Telegram bot).
 * @param {string} waId
 * @param {{ id: string, caption?: string }} image - `messages[].image` from the webhook
 * @returns {Promise<string>} reply text
 */
const handleProofImage = async (waId, image) => {
  const { account } = await resolveSender(waId);
  return attachPaymentProof({
    botIdentity: botIdentityOf(waId),
    account,
    caption: image.caption,
    download: async () => (await downloadMedia(image.id)).buffer,
  });
};

/**
 * @param {{ from: string, type: string, text?: { body: string }, image?: { id: string, caption?: string } }} message
 * @returns {Promise<string>} reply text
 */
const replyTo = async (message) => {
  if (message.type === "image" && message.image?.id) {
    const reply = await handleProofImage(message.from, message.image);
    // Recorded so the model knows about the proof if the chat continues.
    appendExchange(chatKeyOf(message.from), "[mengirim foto bukti pembayaran]", reply);
    return reply;
  }
  const text = message.type === "text" ? message.text?.body?.trim() : "";
  if (!text) return UNSUPPORTED_REPLY;
  return answerText(message.from, text);
};

/**
 * Handles one inbound message end to end: replies, except to a sender who
 * was already told to slow down this window (see {@link floodDecision}).
 * @param {{ from: string }} message
 */
const handleMessage = async (message) => {
  const decision = checkFlood(chatKeyOf(message.from));
  if (decision === "ignore") return;
  try {
    await sendText(message.from, decision === "notify" ? RATE_LIMITED_REPLY : await replyTo(message));
  } catch (error) {
    console.error(`[whatsapp-bot] failed to answer ${message.from}:`, error);
    await sendText(message.from, ERROR_REPLY).catch((sendError) =>
      console.error(`[whatsapp-bot] failed to send error reply to ${message.from}:`, sendError),
    );
  }
};

/**
 * Entry point for a signature-verified webhook body. Returns once every
 * message is queued; replies go out asynchronously, one sender at a time.
 *
 * @param {object} payload - Meta's webhook JSON. Example:
 *   `{ entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: "1395…" }, messages: [{ id, from, type: "text", text: { body } }] } }] }] }`
 */
export const handleWebhookPayload = (payload) => {
  if (!isWhatsappBotConfigured()) return;

  const changes = (payload?.entry ?? []).flatMap((entry) => entry.changes ?? []);
  for (const change of changes) {
    // One Meta app can serve several numbers; only answer for ours. Status
    // callbacks (sent/delivered/read) carry no `messages` and fall through.
    if (change.field !== "messages" || change.value?.metadata?.phone_number_id !== env.WHATSAPP_PHONE_NUMBER_ID) continue;
    for (const message of change.value.messages ?? []) {
      if (!message?.id || !message.from || isDuplicate(message.id)) continue;
      void runExclusive(chatKeyOf(message.from), () => handleMessage(message));
    }
  }
};
