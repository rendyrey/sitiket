import * as eventsRepository from "../repositories/events-repository.js";
import * as orderPaymentsRepository from "../repositories/order-payments-repository.js";
import * as ordersRepository from "../repositories/orders-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { assertEventOwnerOrSuperAdmin } from "../utils/authorize-event-owner.js";
import { conflict, forbidden, notFound } from "../utils/http-error.js";
import { resolvePaymentOptionsForEvent } from "./payment-method-service.js";
import { notifyOrderPaid, notifyPaymentProofRejected, notifyTicketPaymentSubmitted } from "./notification-service.js";
import { pushNotification } from "./web-notification-service.js";
import { issueTicketsForOrder } from "./ticket-service.js";

const formatRupiah = (amount) => `Rp${Number(amount).toLocaleString("id-ID")}`;

const AWAITING_PAYMENT_STATUSES = ["pending_payment", "awaiting_verification"];

/**
 * @param {string} orderId
 * @param {{ userId?: string, guestEmail?: string }} identity - one of the two must be set
 * @param {{ file: { filename: string }, transferNote?: string, method?: "bank_transfer" | "qris" }} submission
 */
export const submitProof = async (orderId, identity, submission) => {
  const order = await ordersRepository.findById(orderId);
  if (!order) throw notFound("ORDER_NOT_FOUND", "Order not found");

  const isOwnOrder = order.user_id ? order.user_id === identity.userId : order.buyer_email === identity.guestEmail;
  if (!isOwnOrder) throw forbidden("NOT_ORDER_OWNER", "You do not have access to this order");

  if (!order.user_id && !order.guest_email_verified_at) {
    throw conflict("EMAIL_NOT_VERIFIED", "Verify the buyer email (OTP) before submitting a payment proof");
  }
  if (!AWAITING_PAYMENT_STATUSES.includes(order.status)) {
    throw conflict("ORDER_NOT_AWAITING_PAYMENT", `Order is "${order.status}" and cannot accept a payment proof`);
  }
  if (new Date(order.payment_expires_at) < new Date()) {
    throw conflict("ORDER_EXPIRED", "This order's payment window has expired");
  }

  const event = await eventsRepository.findById(order.event_id);
  const { recommendedBankAccount, qrisConfig } = await resolvePaymentOptionsForEvent(event);

  // Default to whichever method is actually available when the client doesn't say.
  const method = submission.method ?? (recommendedBankAccount ? "bank_transfer" : "qris");
  if (method === "qris" && !qrisConfig) {
    throw conflict("QRIS_NOT_AVAILABLE", "QRIS payment is not enabled for this event");
  }
  if (method === "bank_transfer" && !recommendedBankAccount) {
    throw conflict("EVENT_OWNER_NO_BANK_ACCOUNT", "This event's organizer has not set up a payout bank account yet");
  }

  const payment = await orderPaymentsRepository.create({
    orderId,
    method,
    bankAccountId: method === "bank_transfer" ? recommendedBankAccount.id : null,
    amount: order.total_amount,
    proofImageUrl: `/uploads/${submission.file.filename}`,
    transferNote: submission.transferNote,
  });

  await ordersRepository.updateStatus(orderId, "awaiting_verification");

  // Header-bell notification for the organizer, alongside the review queue.
  await pushNotification({
    userId: event.owner_id,
    type: "ticket_payment_submitted",
    title: "Ticket payment confirmed by buyer",
    body: `${order.buyer_name} says they paid ${formatRupiah(order.total_amount)} for ${event.name} — review the proof.`,
    href: `/dashboard/admin/events/${event.slug}/orders`,
  });

  // Email the organizer too — the proof queue is only visible when they're
  // in the dashboard, and stale proofs block buyers from getting tickets.
  const organizer = await usersRepository.findById(event.owner_id);
  await notifyTicketPaymentSubmitted(order, event, organizer);

  return payment;
};

/**
 * @param {string} paymentId
 * @param {{ sub: string, role: string }} reviewer
 * @param {"approved" | "rejected"} decision
 * @param {string} [reviewerNotes]
 */
export const reviewProof = async (paymentId, reviewer, decision, reviewerNotes) => {
  const payment = await orderPaymentsRepository.findById(paymentId);
  if (!payment) throw notFound("PAYMENT_NOT_FOUND", "Payment proof not found");
  if (payment.status !== "pending_review") throw conflict("ALREADY_DECIDED", `Payment proof is already "${payment.status}"`);

  const order = await ordersRepository.findById(payment.order_id);
  const event = await eventsRepository.findById(order.event_id);
  assertEventOwnerOrSuperAdmin(event, reviewer);

  await orderPaymentsRepository.decide(paymentId, { status: decision, reviewedBy: reviewer.sub, reviewerNotes });

  if (decision === "approved") {
    await ordersRepository.updateStatus(order.id, "paid");
    const tickets = await issueTicketsForOrder(order.id);
    await notifyOrderPaid(order, tickets, event);
    // Bell notifications: the sale is final for the organizer; the buyer
    // (when signed in — guests have no bell) learns their tickets are ready.
    await pushNotification({
      userId: event.owner_id,
      type: "ticket_order_paid",
      title: "Tickets sold",
      body: `${order.buyer_name}'s ${formatRupiah(order.total_amount)} order for ${event.name} is paid — ${tickets.length} ticket${tickets.length === 1 ? "" : "s"} issued.`,
      href: `/dashboard/admin/events/${event.slug}/orders`,
    });
    if (order.user_id) {
      await pushNotification({
        userId: order.user_id,
        type: "ticket_payment_approved",
        title: "Your tickets are ready",
        body: `Payment for ${event.name} is confirmed — show your QR code${tickets.length === 1 ? "" : "s"} at the gate.`,
        href: `/orders/${order.id}`,
      });
    }
  } else {
    // Buyer may correct and re-submit while the order hasn't expired.
    await ordersRepository.updateStatus(order.id, "pending_payment");
    await notifyPaymentProofRejected(order, reviewerNotes, event);
    if (order.user_id) {
      await pushNotification({
        userId: order.user_id,
        type: "ticket_payment_rejected",
        title: "Ticket payment proof rejected",
        body: `The organizer couldn't verify your payment proof for ${event.name}. Upload a new one while the order is open.`,
        href: `/orders/${order.id}`,
      });
    }
  }

  return orderPaymentsRepository.findById(paymentId);
};

/**
 * Resolves the payment options a buyer should see for an order — the payout
 * bank account(s) to transfer to and/or the organizer's QRIS code to scan.
 * The frontend has no other way to learn them, since
 * `resolvePaymentOptionsForEvent` otherwise only runs server-side inside
 * `submitProof`.
 * @param {string} orderId
 * @param {{ userId?: string, guestEmail?: string }} identity
 */
export const getPaymentInstructions = async (orderId, identity) => {
  const order = await ordersRepository.findById(orderId);
  if (!order) throw notFound("ORDER_NOT_FOUND", "Order not found");

  const isOwnOrder = order.user_id ? order.user_id === identity.userId : order.buyer_email === identity.guestEmail;
  if (!isOwnOrder) throw forbidden("NOT_ORDER_OWNER", "You do not have access to this order");

  const event = await eventsRepository.findById(order.event_id);
  const { recommendedBankAccount, bankAccounts, qrisConfig } = await resolvePaymentOptionsForEvent(event);

  return {
    bankAccounts: bankAccounts.map((account) => ({
      id: account.id,
      bankName: account.bank_name,
      accountNumber: account.account_number,
      accountHolderName: account.account_holder_name,
      isRecommended: account.id === recommendedBankAccount?.id,
    })),
    qris: qrisConfig
      ? { merchantName: qrisConfig.merchant_name, qrisImageUrl: qrisConfig.qris_image_url }
      : null,
    amount: order.total_amount,
  };
};

/**
 * @param {string} orderId
 * @param {{ sub: string, role: string }} requester
 */
export const listForOrder = async (orderId, requester) => {
  const order = await ordersRepository.findById(orderId);
  if (!order) throw notFound("ORDER_NOT_FOUND", "Order not found");

  const isOwnOrder = order.user_id === requester.sub;
  const event = await eventsRepository.findById(order.event_id);
  const isEventOwnerOrSuperAdmin = requester.role === "super_admin" || event.owner_id === requester.sub;
  if (!isOwnOrder && !isEventOwnerOrSuperAdmin) throw forbidden("NOT_ORDER_OWNER", "You do not have access to this order");

  return orderPaymentsRepository.listByOrder(orderId);
};
