import { z } from "zod";
import { env } from "../config/env.js";
import * as eventsRepository from "../repositories/events-repository.js";
import * as merchOrdersRepository from "../repositories/merch-orders-repository.js";
import * as ordersRepository from "../repositories/orders-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { createOrderSchema } from "../schemas/order-schemas.js";
import { createOrder } from "../services/order-service.js";
import {
  formatJakartaTime,
  formatRupiah,
  MERCH_ORDER_STATUS_LABELS,
  paymentInstructionsFor,
  shortRef,
  toolError,
} from "./sitiket-tools.js";

// Ticket tools for the website chat. The web buyer is the signed-in account
// (context.account, from the session), so this is the site's normal signed-in
// checkout — same createOrder, no email OTP — instead of WhatsApp's guest
// checkout. Payment proofs are uploaded on the order page (orderUrl), which
// already has the upload form, countdown and QRIS display.

/** Order statuses that still take a payment proof. */
const OPEN_STATUSES = ["pending_payment", "awaiting_verification"];
/** Recent orders listed per kind by get_my_orders. */
const MAX_LISTED_ORDERS = 5;

/** Buyer-facing Indonesian label per `orders.status` on the web (tickets live on the order page). */
const TICKET_STATUS_LABELS = {
  pending_payment: "Menunggu pembayaran",
  awaiting_verification: "Bukti bayar sedang diverifikasi penyelenggara",
  paid: "Lunas — e-tiket ada di halaman pesanan & menu Tiket saya",
  expired: "Kedaluwarsa (tidak dibayar tepat waktu)",
  cancelled: "Dibatalkan",
  refund_requested: "Pengajuan refund diproses",
  refunded: "Refund selesai",
  refund_rejected: "Refund ditolak",
};

/** Error for any account-bound action by a guest. */
const signInRequired = () =>
  toolError("SIGN_IN_REQUIRED", "The user is not signed in. Ask them to sign in with the Masuk button in the chat, then continue.");

/**
 * The signed-in account, re-read so a phone saved earlier this turn is seen.
 * @param {import("./sitiket-tools.js").ToolContext} context
 */
const loadAccount = async (context) => (context.account ? usersRepository.findById(context.account.id) : null);

/** @param {string} orderId */
const ticketOrderUrl = (orderId) => `${env.FRONTEND_URL}/orders/${orderId}`;

/** @type {import("./sitiket-tools.js").SitiketTool[]} */
export const WEB_TOOLS = [
  {
    name: "create_order",
    roles: ["buyer", "admin", "super_admin"],
    channels: ["web"],
    description:
      "Place a ticket order for the signed-in user (reserves the tickets; no email code needed). Call ONLY after the user confirmed a summary of event, ticket types, quantities and total. Name, email and phone come from their account.",
    // POST /api/orders' schema; buyer name/email always come from the account (as on the web).
    inputSchema: {
      ...createOrderSchema.pick({ eventId: true, items: true, promoCode: true }).shape,
      buyerPhone: z.string().min(6).max(32).optional().describe("Only when the tool asked for it (PHONE_REQUIRED)"),
    },
    handler: async ({ eventId, items, promoCode, buyerPhone }, context) => {
      const account = await loadAccount(context);
      if (!account) return signInRequired();
      const phone = buyerPhone ?? account.phone;
      if (!phone) return toolError("PHONE_REQUIRED", "The account has no phone number; ask the user for one and pass buyerPhone");

      const { order } = await createOrder(
        { sub: account.id, email: account.email },
        { eventId, items, promoCode, buyerName: account.name, buyerEmail: account.email, buyerPhone: phone },
      );
      const event = await eventsRepository.findById(order.event_id);
      return {
        orderRef: shortRef(order.id),
        total: formatRupiah(order.total_amount),
        payment: await paymentInstructionsFor({ ...order, event_name: event.name }, { userId: account.id }),
        orderUrl: ticketOrderUrl(order.id),
        howToSubmitProof: "Upload the transfer proof on the order page (orderUrl) before the payment deadline.",
      };
    },
  },
  {
    name: "get_payment_instructions",
    roles: ["buyer", "admin", "super_admin"],
    channels: ["web"],
    description: "Payment instructions (amount, bank/QRIS, deadline, order page link) for the signed-in user's unpaid ticket orders.",
    inputSchema: {},
    handler: async (_args, context) => {
      const account = await loadAccount(context);
      if (!account) return signInRequired();
      const open = (await ordersRepository.listByUser(account.id)).filter((order) => OPEN_STATUSES.includes(order.status));
      if (open.length === 0) return toolError("NO_OPEN_ORDER", "The user has no ticket order awaiting payment");
      return {
        orders: await Promise.all(
          open.map(async (order) => ({
            ...(await paymentInstructionsFor(order, { userId: account.id })),
            orderUrl: ticketOrderUrl(order.id),
          })),
        ),
      };
    },
  },
  {
    name: "get_my_orders",
    roles: ["buyer", "admin", "super_admin"],
    channels: ["web"],
    description: "List the signed-in user's recent ticket and merch orders with status and order page links.",
    inputSchema: {},
    handler: async (_args, context) => {
      const account = await loadAccount(context);
      if (!account) return signInRequired();
      const [ticketOrders, merchOrders] = await Promise.all([
        ordersRepository.listByUser(account.id),
        merchOrdersRepository.listByBuyer(account.id),
      ]);
      return {
        ticketOrders: ticketOrders.slice(0, MAX_LISTED_ORDERS).map((order) => ({
          orderRef: shortRef(order.id),
          eventName: order.event_name,
          status: TICKET_STATUS_LABELS[order.status] ?? order.status,
          total: formatRupiah(order.total_amount),
          placedAt: formatJakartaTime(order.created_at),
          orderUrl: ticketOrderUrl(order.id),
        })),
        merchOrders: merchOrders.slice(0, MAX_LISTED_ORDERS).map((order) => ({
          orderRef: shortRef(order.id),
          status: MERCH_ORDER_STATUS_LABELS[order.status] ?? order.status,
          courier: order.courier_name,
          total: formatRupiah(order.total_amount),
          placedAt: formatJakartaTime(order.created_at),
          orderUrl: `${env.FRONTEND_URL}/merch-orders/${order.id}`,
        })),
      };
    },
  },
];
