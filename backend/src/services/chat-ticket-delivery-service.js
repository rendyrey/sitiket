import QRCode from "qrcode";
import { isTelegramConfigured, sendTelegramPhoto, sendTelegramText } from "./telegram-client.js";
import { isWhatsappSendConfigured, sendImage, sendText } from "./whatsapp-client.js";

// Delivers issued tickets to buyers who ordered through a bot chat (WhatsApp
// or Telegram): one QR image per ticket, encoding the same signed
// `qr_payload` the web ticket page and the gate scanner use
// (utils/qr-token.js). Email delivery (notification-service.js
// notifyOrderPaid) is unchanged and stays the primary channel — chat delivery
// is best-effort on top of it.

/** Rendering options matching the web ticket page (qrcode.react level "M", 4-module quiet zone). */
const QR_OPTIONS = { errorCorrectionLevel: "M", margin: 4, width: 600 };

/**
 * The chat an order was placed from, with that channel's senders.
 * @param {object} order - an `orders` row
 * @returns {{ label: string, recipient: string, text: (to: string, body: string) => Promise<void>,
 *   photo: (to: string, png: Buffer, caption: string) => Promise<void> } | null}
 */
const chatOf = (order) => {
  if (order.whatsapp_wa_id && isWhatsappSendConfigured()) {
    return {
      label: "WhatsApp",
      recipient: order.whatsapp_wa_id,
      text: sendText,
      photo: (to, png, caption) => sendImage(to, png, "image/png", caption),
    };
  }
  // A Telegram user id is also their private chat id with the bot.
  if (order.telegram_user_id && isTelegramConfigured()) {
    return {
      label: "Telegram",
      recipient: order.telegram_user_id,
      text: (to, body) => sendTelegramText(to, body),
      photo: (to, png, caption) => sendTelegramPhoto(to, png, "image/png", caption),
    };
  }
  return null;
};

/**
 * Sends the order's tickets to the bot chat that placed it. No-op for web
 * orders. Never throws: WhatsApp refuses free-form messages once 24h have
 * passed since the buyer's last message (error 131047), a Telegram user may
 * have blocked the bot, and a failed send must never undo or block the
 * approval — the buyer still has the email.
 *
 * @param {object} order - an `orders` row; acts when `whatsapp_wa_id` or `telegram_user_id` is set
 * @param {Array<{ qr_payload: string, ticket_code: string, ticket_type_name: string }>} tickets -
 *   rows from `ticketsRepository.listByOrderWithContext`
 * @param {{ name: string }} event
 * @returns {Promise<void>}
 */
export const sendTicketsToBotChat = async (order, tickets, event) => {
  const chat = chatOf(order);
  if (!chat) return;
  try {
    await chat.text(
      chat.recipient,
      `Pembayaran untuk *${event.name}* sudah disetujui ✅\n\nBerikut ${tickets.length} e-tiket kamu. Tunjukkan QR code di pintu masuk. Salinan juga dikirim ke *${order.buyer_email}*.`,
    );
    for (const [index, ticket] of tickets.entries()) {
      const png = await QRCode.toBuffer(ticket.qr_payload, QR_OPTIONS);
      await chat.photo(chat.recipient, png, `Tiket ${index + 1}/${tickets.length} — ${ticket.ticket_type_name}\nKode: ${ticket.ticket_code}`);
    }
  } catch (error) {
    console.error(`[chat-tickets] failed to deliver tickets for order ${order.id} via ${chat.label}:`, error);
  }
};
