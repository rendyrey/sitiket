import * as merchOrderPaymentsRepository from "../repositories/merch-order-payments-repository.js";
import * as merchOrdersRepository from "../repositories/merch-orders-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { conflict, forbidden, notFound } from "../utils/http-error.js";
import {
  notifyMerchOrderPaid,
  notifyMerchPaymentSubmitted,
  notifyMerchProofRejected,
} from "./notification-service.js";
import { getOrderWithItems } from "./merch-order-service.js";
import { resolvePaymentOptionsForSeller } from "./payment-method-service.js";
import { pushNotification } from "./web-notification-service.js";

const AWAITING_PAYMENT_STATUSES = ["pending_payment", "awaiting_verification"];

const formatRupiah = (amount) => `Rp${Number(amount).toLocaleString("id-ID")}`;

const assertBuyer = (order, requester) => {
  if (order.user_id !== requester.sub) {
    throw forbidden("NOT_MERCH_ORDER_OWNER", "You do not have access to this merch order");
  }
};

/**
 * The buyer's "confirm I have paid" step: stores the uploaded proof, moves
 * the order to awaiting_verification, and notifies the seller by email AND
 * in-app bell notification (per the product spec). Mirrors the ticket
 * order-payment-service.js flow — `payment_expires_at` (not the sweep) is
 * the authority on whether the window is still open.
 * @param {string} orderId
 * @param {{ sub: string }} requester - must be the order's buyer
 * @param {{ file: { filename: string }, transferNote?: string, method?: "bank_transfer" | "qris" }} submission
 */
export const submitProof = async (orderId, requester, submission) => {
  const order = await merchOrdersRepository.findById(orderId);
  if (!order) throw notFound("MERCH_ORDER_NOT_FOUND", "Merch order not found");
  assertBuyer(order, requester);

  if (!AWAITING_PAYMENT_STATUSES.includes(order.status)) {
    throw conflict("MERCH_ORDER_NOT_AWAITING_PAYMENT", `Merch order is "${order.status}" and cannot accept a payment proof`);
  }
  if (new Date(order.payment_expires_at) < new Date()) {
    throw conflict("MERCH_ORDER_EXPIRED", "This order's payment window has expired");
  }

  const { recommendedBankAccount, qrisConfig } = await resolvePaymentOptionsForSeller(order.seller_id);

  const method = submission.method ?? (recommendedBankAccount ? "bank_transfer" : "qris");
  if (method === "qris" && !qrisConfig) {
    throw conflict("QRIS_NOT_AVAILABLE", "QRIS payment is not available for this seller");
  }
  if (method === "bank_transfer" && !recommendedBankAccount) {
    throw conflict("SELLER_NO_BANK_ACCOUNT", "This seller has not set up a payout bank account yet");
  }

  const payment = await merchOrderPaymentsRepository.create({
    merchOrderId: orderId,
    method,
    bankAccountId: method === "bank_transfer" ? recommendedBankAccount.id : null,
    amount: order.total_amount,
    proofImageUrl: `/uploads/${submission.file.filename}`,
    transferNote: submission.transferNote,
  });

  await merchOrdersRepository.updateStatus(orderId, "awaiting_verification");

  const seller = await usersRepository.findById(order.seller_id);
  await notifyMerchPaymentSubmitted(order, seller);
  await pushNotification({
    userId: order.seller_id,
    type: "merch_payment_submitted",
    title: "Merch payment confirmed by buyer",
    body: `${order.buyer_name} says they paid ${formatRupiah(order.total_amount)} — review the proof.`,
    href: "/dashboard/admin/merch/orders",
  });

  return payment;
};

/**
 * Seller (or super_admin) approves/rejects a submitted proof. Approval marks
 * the order paid; rejection reopens it for a re-submission while the window
 * lasts. The buyer hears about either outcome by email and bell notification.
 * @param {string} paymentId
 * @param {{ sub: string, role: string }} reviewer
 * @param {"approved" | "rejected"} decision
 * @param {string} [reviewerNotes]
 */
export const reviewProof = async (paymentId, reviewer, decision, reviewerNotes) => {
  const payment = await merchOrderPaymentsRepository.findById(paymentId);
  if (!payment) throw notFound("PAYMENT_NOT_FOUND", "Payment proof not found");
  if (payment.status !== "pending_review") throw conflict("ALREADY_DECIDED", `Payment proof is already "${payment.status}"`);

  const order = await merchOrdersRepository.findById(payment.merch_order_id);
  if (order.seller_id !== reviewer.sub && reviewer.role !== "super_admin") {
    throw forbidden("NOT_MERCH_SELLER", "Only the seller or a super_admin can review this payment");
  }

  await merchOrderPaymentsRepository.decide(paymentId, { status: decision, reviewedBy: reviewer.sub, reviewerNotes });

  const seller = await usersRepository.findById(order.seller_id);
  if (decision === "approved") {
    await merchOrdersRepository.updateStatus(order.id, "paid");
    const orderWithItems = await getOrderWithItems(order.id);
    await notifyMerchOrderPaid(orderWithItems, seller);
    await pushNotification({
      userId: order.user_id,
      type: "merch_payment_approved",
      title: "Merch payment confirmed",
      body: `${seller?.name ?? "The seller"} confirmed your ${formatRupiah(order.total_amount)} payment. Your order is being prepared.`,
      href: `/merch-orders/${order.id}`,
    });
  } else {
    // Buyer may correct and re-submit while the order hasn't expired.
    await merchOrdersRepository.updateStatus(order.id, "pending_payment");
    await notifyMerchProofRejected(order, reviewerNotes, seller);
    await pushNotification({
      userId: order.user_id,
      type: "merch_payment_rejected",
      title: "Merch payment proof rejected",
      body: "The seller couldn't verify your payment proof. Upload a new one while the order is open.",
      href: `/merch-orders/${order.id}`,
    });
  }

  return merchOrderPaymentsRepository.findById(paymentId);
};

/**
 * Payment options the buyer should see for a merch order — the seller's
 * payout bank account(s) and/or QRIS code, plus the amount.
 * @param {string} orderId
 * @param {{ sub: string, role: string }} requester - must be the order's buyer
 */
export const getPaymentInstructions = async (orderId, requester) => {
  const order = await merchOrdersRepository.findById(orderId);
  if (!order) throw notFound("MERCH_ORDER_NOT_FOUND", "Merch order not found");
  assertBuyer(order, requester);

  const { recommendedBankAccount, bankAccounts, qrisConfig } = await resolvePaymentOptionsForSeller(order.seller_id);

  return {
    bankAccounts: bankAccounts.map((account) => ({
      id: account.id,
      bankName: account.bank_name,
      accountNumber: account.account_number,
      accountHolderName: account.account_holder_name,
      isRecommended: account.id === recommendedBankAccount?.id,
    })),
    qris: qrisConfig ? { merchantName: qrisConfig.merchant_name, qrisImageUrl: qrisConfig.qris_image_url } : null,
    amount: order.total_amount,
  };
};

/**
 * @param {string} orderId
 * @param {{ sub: string, role: string }} requester - buyer, seller, or super_admin
 */
export const listForOrder = async (orderId, requester) => {
  const order = await merchOrdersRepository.findById(orderId);
  if (!order) throw notFound("MERCH_ORDER_NOT_FOUND", "Merch order not found");

  const allowed =
    order.user_id === requester.sub || order.seller_id === requester.sub || requester.role === "super_admin";
  if (!allowed) throw forbidden("NOT_MERCH_ORDER_PARTY", "You do not have access to this merch order");

  return merchOrderPaymentsRepository.listByOrder(orderId);
};
