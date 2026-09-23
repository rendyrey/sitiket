import { shortRef } from "../mcp/sitiket-tools.js";
import { storeImage } from "../middleware/upload.js";
import * as merchOrdersRepository from "../repositories/merch-orders-repository.js";
import * as ordersRepository from "../repositories/orders-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { HttpError } from "../utils/http-error.js";
import { submitProof as submitMerchProof } from "./merch-payment-service.js";
import { submitProof } from "./order-payment-service.js";

// Payment-proof photos sent in a bot chat (WhatsApp, Telegram). No LLM is
// involved: a photo is always a proof. It's attached to one of the chat's
// open orders — the bot ticket order tagged with this chat's identity, or an
// open merch order on the linked account — through the same submitProof the
// web checkout uses, stored in R2 under proofs/tickets or proofs/merch.

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

/**
 * Picks which open order a payment photo belongs to. The caption decides when
 * it names one order's reference; otherwise a single open order is the
 * obvious target, and several are ambiguous (the buyer is asked to resend
 * with the reference as caption).
 *
 * @param {Array<{ ref: string }>} candidates - the chat's open orders. Example: `[{ ref: "a1b2c3d4", … }]`
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
 * The orders a payment photo could be for: the chat's open bot ticket order
 * and the open merch orders on its linked account (one per seller).
 * @param {import("../repositories/orders-repository.js").BotIdentity} botIdentity
 * @param {object | undefined} account - linked `users` row
 * @returns {Promise<Array<{ kind: "ticket" | "merch", ref: string, label: string, order: object }>>}
 */
const listProofCandidates = async (botIdentity, account) => {
  const ticketOrder = await ordersRepository.findLatestOpenByBotIdentity(botIdentity);
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
 * Attaches a chat photo to one of the chat's open orders as its payment proof.
 *
 * @param {object} input
 * @param {import("../repositories/orders-repository.js").BotIdentity} input.botIdentity - this chat's bot identity
 * @param {object | undefined} input.account - the linked account, for merch orders
 * @param {string | undefined} input.caption - photo caption; may name the order ref and becomes the transfer note
 * @param {() => Promise<Buffer>} input.download - fetches the photo bytes from the chat platform (only called once a target is known)
 * @returns {Promise<string>} reply text (WhatsApp-style formatting)
 */
export const attachPaymentProof = async ({ botIdentity, account, caption, download }) => {
  const candidates = await listProofCandidates(botIdentity, account);
  if (candidates.length === 0) {
    return "Belum ada pesanan dari chat ini yang menunggu pembayaran, Kak. Ketik pertanyaanmu, misalnya *event apa saja yang tersedia?* atau *merch apa saja yang ada?*";
  }
  const target = pickProofTarget(candidates, caption);
  if (!target) {
    return [
      "Kakak punya beberapa pesanan yang menunggu pembayaran:",
      ...candidates.map((candidate) => `- *${candidate.ref}* — ${candidate.label}`),
      "",
      `Kirim ulang foto buktinya dengan *caption kode pesanan* yang dibayar, ya (contoh: *${candidates[0].ref}*).`,
    ].join("\n");
  }

  const { order } = target;
  if (target.kind === "ticket" && !order.guest_email_verified_at) {
    return `Sebelum mengirim bukti bayar, ketik dulu kode verifikasi 6 digit yang kami kirim ke *${order.buyer_email}*.`;
  }
  // Checked up front so an expired order doesn't leave an orphan image in R2.
  if (new Date(order.payment_expires_at) < new Date()) return PROOF_ERROR_REPLIES.ORDER_EXPIRED;

  const transferNote = caption?.trim().slice(0, 500) || undefined;
  try {
    const bytes = await download();
    if (target.kind === "ticket") {
      const { key } = await storeImage(bytes, "proofs/tickets");
      await submitProof(order.id, { guestEmail: order.buyer_email }, { file: { filename: key }, transferNote });
    } else {
      const { key } = await storeImage(bytes, "proofs/merch");
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
