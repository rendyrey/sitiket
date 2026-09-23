import { env } from "../config/env.js";
import { shortRef } from "../mcp/sitiket-tools.js";
import { storeImage } from "../middleware/upload.js";
import * as merchOrdersRepository from "../repositories/merch-orders-repository.js";
import * as ordersRepository from "../repositories/orders-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { HttpError } from "../utils/http-error.js";
import { toWhatsappId } from "../utils/phone.js";
import { appendExchange, checkFlood, isAssistantConfigured, runAssistantTurn, runExclusive } from "./assistant-service.js";
import { submitProof as submitMerchProof } from "./merch-payment-service.js";
import { submitProof } from "./order-payment-service.js";
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

/** Order statuses (ticket and merch alike) that still take a payment proof. */
const OPEN_PAYMENT_STATUSES = ["pending_payment", "awaiting_verification"];

/** Indonesian reply per proof-upload failure the buyer can act on. */
const PROOF_ERROR_REPLIES = {
  ORDER_EXPIRED: "Batas waktu pembayaran pesanan ini sudah habis, jadi bukti tidak bisa diterima. Silakan buat pesanan baru.",
  MERCH_ORDER_EXPIRED: "Batas waktu pembayaran pesanan ini sudah habis, jadi bukti tidak bisa diterima. Silakan buat pesanan baru.",
  ORDER_NOT_AWAITING_PAYMENT: "Pesanan ini sedang tidak menunggu pembayaran, jadi bukti tidak bisa dikirim.",
  MERCH_ORDER_NOT_AWAITING_PAYMENT: "Pesanan ini sedang tidak menunggu pembayaran, jadi bukti tidak bisa dikirim.",
  SELLER_NO_BANK_ACCOUNT: "Metode pembayaran penjual belum siap. Silakan hubungi penjualnya lewat website SiTIKET.",
  INVALID_IMAGE: "Foto tidak bisa dibaca. Coba kirim ulang foto bukti transfer (JPG/PNG), ya.",
  INVALID_IMAGE_TYPE: "Format foto tidak didukung. Kirim foto bukti transfer dalam format JPG atau PNG, ya.",
  QRIS_NOT_AVAILABLE: "Metode pembayaran penyelenggara belum siap. Silakan hubungi penyelenggara event.",
  EVENT_OWNER_NO_BANK_ACCOUNT: "Metode pembayaran penyelenggara belum siap. Silakan hubungi penyelenggara event.",
};

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
 * Who is messaging, from the active accounts whose profile phone is the
 * sender's WhatsApp number (the sender id comes from Meta's signed webhook,
 * so it can't be spoofed):
 * - role: super_admin > admin > buyer;
 * - account: the account merch orders/address updates act on — the staff
 *   account when there is one, else the single matching account. Several
 *   plain accounts sharing one number are ambiguous, so none is used.
 *
 * @param {string} waId - Example: `"628112003717"`
 * @returns {Promise<{ role: "buyer" | "admin" | "super_admin", staff?: object, account?: object, duplicateAccounts: boolean }>}
 */
export const resolveSender = async (waId) => {
  // SQL narrows by stripped phone; toWhatsappId is the exact check.
  const accounts = (await usersRepository.findActiveByWhatsappId(waId)).filter((user) => toWhatsappId(user.phone) === waId);
  const staff = accounts.find((user) => user.role === "super_admin") ?? accounts.find((user) => user.role === "admin");
  const account = staff ?? (accounts.length === 1 ? accounts[0] : undefined);
  return { role: staff?.role ?? "buyer", staff, account, duplicateAccounts: !account && accounts.length > 1 };
};

/**
 * Picks which open order a payment photo belongs to. The caption decides when
 * it names one order's reference; otherwise a single open order is the
 * obvious target, and several are ambiguous (the buyer is asked to resend
 * with the reference as caption).
 *
 * @param {Array<{ ref: string }>} candidates - the sender's open orders. Example: `[{ ref: "a1b2c3d4", … }]`
 * @param {string | undefined} caption - photo caption. Example: `"bayar a1b2c3d4"`
 * @returns {object | null} the chosen candidate, or null when ambiguous/none
 */
export const pickProofTarget = (candidates, caption) => {
  const text = (caption ?? "").toLowerCase();
  const named = candidates.filter((candidate) => text.includes(candidate.ref));
  if (named.length === 1) return named[0];
  return candidates.length === 1 ? candidates[0] : null;
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
 * Answers a text message through the shared assistant engine.
 * @param {string} waId - Example: `"628112003717"`
 * @param {string} text - Example: `"event apa aja bulan ini?"`
 * @returns {Promise<string>} reply text
 */
const answerText = async (waId, text) => {
  const sender = await resolveSender(waId);
  const { reply } = await runAssistantTurn({ chatKey: chatKeyOf(waId), context: { channel: "whatsapp", waId, ...sender }, text });
  return reply;
};

/**
 * The sender's orders a payment photo could be for: their open bot ticket
 * order and the open merch orders on their linked account (one per seller).
 * @param {string} waId
 * @param {object | undefined} account - linked `users` row, see {@link resolveSender}
 * @returns {Promise<Array<{ kind: "ticket" | "merch", ref: string, label: string, order: object }>>}
 */
const listProofCandidates = async (waId, account) => {
  const ticketOrder = await ordersRepository.findLatestOpenByWhatsappWaId(waId);
  const merchOrders = account
    ? (await merchOrdersRepository.listByBuyer(account.id)).filter((order) => OPEN_PAYMENT_STATUSES.includes(order.status))
    : [];
  const sellers = await Promise.all(merchOrders.map((order) => usersRepository.findById(order.seller_id)));
  return [
    ...(ticketOrder ? [{ kind: "ticket", ref: shortRef(ticketOrder.id), label: `tiket ${ticketOrder.event_name}`, order: ticketOrder }] : []),
    ...merchOrders.map((order, index) => ({
      kind: "merch",
      ref: shortRef(order.id),
      label: `merch dari ${sellers[index]?.name ?? "penjual"}`,
      order,
    })),
  ];
};

/**
 * Attaches a photo to one of the sender's open orders as its payment proof —
 * the same submitProof the web checkout uses (tickets or merch), stored in R2
 * under proofs/tickets or proofs/merch. No LLM involved: a photo is always a
 * proof; which order it's for comes from {@link pickProofTarget}.
 *
 * @param {string} waId
 * @param {{ id: string, caption?: string }} image - `messages[].image` from the webhook
 * @returns {Promise<string>} reply text
 */
const handleProofImage = async (waId, image) => {
  const { account } = await resolveSender(waId);
  const candidates = await listProofCandidates(waId, account);
  if (candidates.length === 0) {
    return "Belum ada pesanan dari nomor ini yang menunggu pembayaran, Kak. Ketik pertanyaanmu, misalnya *event apa saja yang tersedia?* atau *merch apa saja yang ada?*";
  }
  const target = pickProofTarget(candidates, image.caption);
  if (!target) {
    return [
      "Kakak punya beberapa pesanan yang menunggu pembayaran:",
      ...candidates.map((candidate) => `- *${candidate.ref}* — ${candidate.label}`),
      "",
      "Kirim ulang foto buktinya dengan *caption kode pesanan* yang dibayar, ya (contoh: *" + candidates[0].ref + "*).",
    ].join("\n");
  }

  const { order } = target;
  if (target.kind === "ticket" && !order.guest_email_verified_at) {
    return `Sebelum mengirim bukti bayar, ketik dulu kode verifikasi 6 digit yang kami kirim ke *${order.buyer_email}*.`;
  }
  // Checked up front so an expired order doesn't leave an orphan image in R2.
  if (new Date(order.payment_expires_at) < new Date()) return PROOF_ERROR_REPLIES.ORDER_EXPIRED;

  const transferNote = image.caption?.trim().slice(0, 500) || undefined;
  try {
    const media = await downloadMedia(image.id);
    if (target.kind === "ticket") {
      const { key } = await storeImage(media.buffer, "proofs/tickets");
      await submitProof(order.id, { guestEmail: order.buyer_email }, { file: { filename: key }, transferNote });
    } else {
      const { key } = await storeImage(media.buffer, "proofs/merch");
      await submitMerchProof(order.id, { sub: account.id }, { file: { filename: key }, transferNote });
    }
  } catch (error) {
    if (error instanceof HttpError && PROOF_ERROR_REPLIES[error.code]) return PROOF_ERROR_REPLIES[error.code];
    throw error;
  }

  const nextStep =
    target.kind === "ticket"
      ? `Pembayaran sedang diverifikasi oleh penyelenggara. Setelah disetujui, QR e-tiket dikirim ke chat ini dan ke *${order.buyer_email}*.`
      : "Pembayaran sedang diverifikasi oleh penjual. Setelah disetujui, pesanan disiapkan dan dikirim ke alamatmu.";
  return [
    `Bukti pembayaran untuk pesanan *${target.ref}* (${target.label}) sudah kami terima ✅`,
    "",
    `${nextStep} Ketik *status pesanan* untuk mengecek kapan saja.`,
  ].join("\n");
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
