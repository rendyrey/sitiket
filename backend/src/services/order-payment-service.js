import * as eventsRepository from "../repositories/events-repository.js";
import * as orderPaymentsRepository from "../repositories/order-payments-repository.js";
import * as ordersRepository from "../repositories/orders-repository.js";
import { assertEventOwnerOrSuperAdmin } from "../utils/authorize-event-owner.js";
import { conflict, forbidden, notFound } from "../utils/http-error.js";
import { resolveForEvent as resolveBankAccountForEvent } from "./bank-account-service.js";
import { issueTicketsForOrder } from "./ticket-service.js";

const AWAITING_PAYMENT_STATUSES = ["pending_payment", "awaiting_verification"];

/**
 * @param {string} orderId
 * @param {{ userId?: string, guestEmail?: string }} identity - one of the two must be set
 * @param {{ file: { filename: string }, transferNote?: string }} submission
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
  const bankAccount = await resolveBankAccountForEvent(event);

  const payment = await orderPaymentsRepository.create({
    orderId,
    bankAccountId: bankAccount.id,
    amount: order.total_amount,
    proofImageUrl: `/uploads/${submission.file.filename}`,
    transferNote: submission.transferNote,
  });

  await ordersRepository.updateStatus(orderId, "awaiting_verification");
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
    await issueTicketsForOrder(order.id);
  } else {
    // Buyer may correct and re-submit while the order hasn't expired.
    await ordersRepository.updateStatus(order.id, "pending_payment");
  }

  return orderPaymentsRepository.findById(paymentId);
};

/**
 * Resolves the payout bank account a buyer should see for an order — the
 * frontend has no other way to learn where to transfer, since
 * `resolveBankAccountForEvent` otherwise only runs server-side inside
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
  const bankAccount = await resolveBankAccountForEvent(event);

  return {
    bankName: bankAccount.bank_name,
    accountNumber: bankAccount.account_number,
    accountHolderName: bankAccount.account_holder_name,
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
