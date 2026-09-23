import QRCode from "qrcode";
import { isWhatsappSendConfigured, sendPngImage, sendText } from "./whatsapp-client.js";

// Delivers issued tickets to buyers who ordered through the WhatsApp bot:
// one QR image per ticket, encoding the same signed `qr_payload` the web
// ticket page and the gate scanner use (utils/qr-token.js). Email delivery
// (notification-service.js notifyOrderPaid) is unchanged and stays the
// primary channel — WhatsApp is best-effort on top of it.

/** Rendering options matching the web ticket page (qrcode.react level "M", 4-module quiet zone). */
const QR_OPTIONS = { errorCorrectionLevel: "M", margin: 4, width: 600 };

/**
 * Sends the order's tickets to the WhatsApp number that placed it. No-op for
 * web orders. Never throws: WhatsApp refuses free-form messages once 24h have
 * passed since the buyer's last message (error 131047), and a failed send must
 * never undo or block the approval — the buyer still has the email.
 *
 * @param {object} order - an `orders` row; only acts when `whatsapp_wa_id` is set
 * @param {Array<{ qr_payload: string, ticket_code: string, ticket_type_name: string }>} tickets -
 *   rows from `ticketsRepository.listByOrderWithContext`
 * @param {{ name: string }} event
 * @returns {Promise<void>}
 */
export const sendTicketsViaWhatsapp = async (order, tickets, event) => {
  if (!order.whatsapp_wa_id || !isWhatsappSendConfigured()) return;
  try {
    await sendText(
      order.whatsapp_wa_id,
      `Pembayaran untuk *${event.name}* sudah disetujui ✅\n\nBerikut ${tickets.length} e-tiket kamu. Tunjukkan QR code di pintu masuk. Salinan juga dikirim ke *${order.buyer_email}*.`,
    );
    for (const [index, ticket] of tickets.entries()) {
      const png = await QRCode.toBuffer(ticket.qr_payload, QR_OPTIONS);
      await sendPngImage(
        order.whatsapp_wa_id,
        png,
        `Tiket ${index + 1}/${tickets.length} — ${ticket.ticket_type_name}\nKode: ${ticket.ticket_code}`,
      );
    }
  } catch (error) {
    console.error(`[whatsapp-tickets] failed to deliver tickets for order ${order.id}:`, error);
  }
};
