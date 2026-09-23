import { env } from "../config/env.js";
import * as telegramContactsRepository from "../repositories/telegram-contacts-repository.js";
import { toWhatsappId } from "../utils/phone.js";
import { appendExchange, checkFlood, isAssistantConfigured, runAssistantTurn, runExclusive } from "./assistant-service.js";
import { resolveSender } from "./chat-identity-service.js";
import { attachPaymentProof } from "./chat-proof-service.js";
import { downloadTelegramFile, getTelegramUpdates, isTelegramConfigured, sendTelegramText } from "./telegram-client.js";

// Telegram channel of the SiTIKET assistant. Long-polls the Bot API (no
// webhook, so no public route or nginx change), answers private chats through
// the shared assistant engine and MCP tools, and treats photos as payment
// proofs (services/chat-proof-service.js), exactly like the WhatsApp bot.
//
// Identity: Telegram gives no phone by default. Anyone can browse and buy
// tickets through guest checkout (email OTP). Sharing the phone via the
// contact button (Telegram vouches for the number, and we check the contact
// is the sender's own) links the chat to the SiTIKET account with that
// profile phone — the same match WhatsApp uses — unlocking merch, address
// changes and the admin/super admin tools.

/** Seconds Telegram holds an idle getUpdates open. */
const POLL_TIMEOUT_SECONDS = 50;
/** Pause after a failed poll before retrying. */
const RETRY_DELAY_MS = 5000;
/** Documents accepted as proof photos (users often send receipts "as file", uncompressed). */
const IMAGE_DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Persistent keyboard with Telegram's native "share my contact" button, shown until the number is shared. */
const SHARE_PHONE_KEYBOARD = {
  keyboard: [[{ text: "📱 Bagikan nomor HP", request_contact: true }]],
  resize_keyboard: true,
  is_persistent: true,
};
/** Removes {@link SHARE_PHONE_KEYBOARD} once the number is known. */
const REMOVE_KEYBOARD = { remove_keyboard: true };

const WELCOME_REPLY = `Halo Kak! 👋 Mimin SiTIKET di sini — asisten tiket event & merchandise ${env.FRONTEND_URL}.

Mimin bisa bantu:
- cari event & cek harga tiket
- beli tiket langsung di chat ini
- lihat & beli merch
- cek status pesanan

Untuk merch dan cek akun, tekan *📱 Bagikan nomor HP* di bawah (nomornya harus sama dengan di profil akun SiTIKET). Mau mulai dari mana?`;
const ERROR_REPLY = "Maaf Kak, sistem kami sedang ada gangguan 🙏 Silakan coba lagi beberapa saat lagi, ya.";
const UNSUPPORTED_REPLY =
  "Maaf Kak, Mimin hanya bisa membaca pesan teks dan *foto* bukti pembayaran. Silakan ketik pertanyaannya atau kirim foto bukti transfer, ya.";
const RATE_LIMITED_REPLY = "Pesannya banyak sekali dalam waktu singkat, Kak. Tunggu beberapa menit lalu coba lagi, ya 🙏";

/** Whether the poll loop is already running (one per process). */
let isPolling = false;

/** @returns {boolean} true when the bot token and the assistant LLM are configured. */
export const isTelegramBotConfigured = () => isTelegramConfigured() && isAssistantConfigured();

/** History/flood key of one Telegram user. Example: `"tg:123456789"` */
const chatKeyOf = (userId) => `tg:${userId}`;

/**
 * How this user's guest ticket orders are tagged.
 * @param {string} userId - Example: `"123456789"`
 * @returns {import("../repositories/orders-repository.js").BotIdentity}
 */
const botIdentityOf = (userId) => ({ column: "telegram_user_id", value: userId });

/**
 * Who is chatting: from the phone the user shared (if any), the same account
 * match as WhatsApp.
 * @param {string} userId
 * @returns {Promise<{ role: "buyer" | "admin" | "super_admin", staff?: object, account?: object,
 *   duplicateAccounts: boolean, verifiedPhone?: string }>}
 */
const resolveTelegramSender = async (userId) => {
  const phone = await telegramContactsRepository.findPhone(userId);
  if (!phone) return { role: "buyer", duplicateAccounts: false };
  return { ...(await resolveSender(phone)), verifiedPhone: phone };
};

/**
 * Stores a shared contact — only the sender's own (anyone can forward someone
 * else's contact card, and that must never link their account).
 * @param {{ contact: { user_id?: number, phone_number: string } }} message
 * @param {string} userId
 * @returns {Promise<{ text: string, keyboard: object }>}
 */
const handleContact = async (message, userId) => {
  if (String(message.contact.user_id ?? "") !== userId) {
    return { text: "Mohon bagikan nomor HP *milik sendiri* lewat tombol di bawah, ya Kak 🙏", keyboard: SHARE_PHONE_KEYBOARD };
  }
  const phone = toWhatsappId(message.contact.phone_number);
  await telegramContactsRepository.upsert(userId, phone);
  const sender = await resolveSender(phone);

  const linked =
    sender.role === "super_admin"
      ? "akun *Super Admin* SiTIKET"
      : sender.role === "admin"
        ? "akun *Admin* (penyelenggara) SiTIKET"
        : sender.account
          ? `akun SiTIKET *${sender.account.name}*`
          : null;
  const text = linked
    ? `Terima kasih, Kak! Nomor kamu terhubung dengan ${linked} ✅\n\nSekarang Mimin bisa bantu beli merch, cek pesanan, dan ubah alamat. Mau mulai dari mana?`
    : `Terima kasih, Kak! Nomor kamu sudah tersimpan ✅\n\nBelum ada akun SiTIKET dengan nomor ini. Untuk beli merch, login di ${env.FRONTEND_URL}/login lalu simpan nomor yang sama di ${env.FRONTEND_URL}/account/profile. Tiket event tetap bisa dibeli langsung di chat ini.`;
  appendExchange(chatKeyOf(userId), "[membagikan nomor HP]", text);
  return { text, keyboard: REMOVE_KEYBOARD };
};

/**
 * Builds the reply to one private message.
 * @param {object} message - Telegram `Message`
 * @param {string} userId
 * @returns {Promise<{ text: string, keyboard?: object }>}
 */
const replyTo = async (message, userId) => {
  if (message.contact) return handleContact(message, userId);

  const sender = await resolveTelegramSender(userId);
  const keyboard = sender.verifiedPhone ? undefined : SHARE_PHONE_KEYBOARD;

  // Largest size of a photo, or an image sent as a file.
  const imageFileId =
    message.photo?.at(-1)?.file_id ?? (IMAGE_DOCUMENT_TYPES.includes(message.document?.mime_type) ? message.document.file_id : null);
  if (imageFileId) {
    const text = await attachPaymentProof({
      botIdentity: botIdentityOf(userId),
      account: sender.account,
      caption: message.caption,
      download: () => downloadTelegramFile(imageFileId),
    });
    appendExchange(chatKeyOf(userId), "[mengirim foto bukti pembayaran]", text);
    return { text, keyboard };
  }

  const text = message.text?.trim();
  if (!text) return { text: UNSUPPORTED_REPLY, keyboard };
  // Static greeting for the "Start" button — no LLM call.
  if (/^\/start\b/.test(text)) return { text: WELCOME_REPLY, keyboard };

  const context = {
    channel: "telegram",
    telegramChatId: String(message.chat.id),
    botIdentity: botIdentityOf(userId),
    ...sender,
  };
  const { reply } = await runAssistantTurn({ chatKey: chatKeyOf(userId), context, text });
  return { text: reply, keyboard };
};

/**
 * Handles one message end to end: replies, except to a user who was already
 * told to slow down this window (assistant-service.js `floodDecision`).
 * Group chats and other bots are ignored.
 * @param {object} message - Telegram `Message`
 */
const handleMessage = async (message) => {
  if (message.chat?.type !== "private" || !message.from || message.from.is_bot) return;
  const userId = String(message.from.id);
  const decision = checkFlood(chatKeyOf(userId));
  if (decision === "ignore") return;
  try {
    const { text, keyboard } = decision === "notify" ? { text: RATE_LIMITED_REPLY } : await replyTo(message, userId);
    await sendTelegramText(message.chat.id, text, keyboard);
  } catch (error) {
    console.error(`[telegram-bot] failed to answer ${userId}:`, error);
    await sendTelegramText(message.chat.id, ERROR_REPLY).catch((sendError) =>
      console.error(`[telegram-bot] failed to send error reply to ${userId}:`, sendError),
    );
  }
};

/**
 * Entry point per Telegram update; one user's messages run in order.
 * @param {{ update_id: number, message?: object }} update
 * @returns {Promise<void>} settles once this update is answered
 */
export const handleTelegramUpdate = (update) => {
  const message = update.message;
  if (!message?.from) return Promise.resolve();
  return runExclusive(chatKeyOf(String(message.from.id)), () => handleMessage(message));
};

/**
 * Starts the long-poll loop (idempotent). Each batch is acknowledged by the
 * next getUpdates call's offset.
 * ponytail: a crash mid-batch re-delivers that batch after restart (in-memory
 * dedupe is gone), so a user may get one reply twice; persist the offset if that matters.
 */
export const startTelegramPolling = () => {
  if (isPolling) return;
  isPolling = true;
  let offset = 0;

  const loop = async () => {
    for (;;) {
      try {
        const updates = await getTelegramUpdates(offset, POLL_TIMEOUT_SECONDS);
        for (const update of updates) {
          offset = update.update_id + 1;
          handleTelegramUpdate(update).catch((error) => console.error("[telegram-bot] update failed:", error));
        }
      } catch (error) {
        const hint = error.errorCode === 409 ? " — a webhook or another poller is using this bot token" : "";
        console.error(`[telegram-bot] polling failed${hint}:`, error.message);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  };
  void loop();
  console.log("[telegram-bot] polling Telegram for messages");
};
