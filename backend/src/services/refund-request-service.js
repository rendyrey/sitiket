import { db } from "../config/db.js";
import * as eventsRepository from "../repositories/events-repository.js";
import * as ordersRepository from "../repositories/orders-repository.js";
import * as refundRequestsRepository from "../repositories/refund-requests-repository.js";
import * as ticketsRepository from "../repositories/tickets-repository.js";
import { assertEventOwnerOrSuperAdmin } from "../utils/authorize-event-owner.js";
import { conflict, forbidden, notFound } from "../utils/http-error.js";

/**
 * Files a manual, status-tracked refund request for a paid order — no
 * payment-gateway refund API in v1; an actual transfer happens offline. See
 * docs/business/PAYMENT_VERIFICATION.md.
 * @param {string} orderId
 * @param {{ userId?: string, guestEmail?: string }} identity
 * @param {string} reason
 */
export const request = async (orderId, identity, reason) => {
  const order = await ordersRepository.findById(orderId);
  if (!order) throw notFound("ORDER_NOT_FOUND", "Order not found");

  const isOwnOrder = order.user_id ? order.user_id === identity.userId : order.buyer_email === identity.guestEmail;
  if (!isOwnOrder) throw forbidden("NOT_ORDER_OWNER", "You do not have access to this order");

  if (order.status !== "paid") {
    throw conflict("ORDER_NOT_REFUNDABLE", `Only a "paid" order can be refunded (this one is "${order.status}")`);
  }

  const refundRequest = await refundRequestsRepository.create({ orderId, requestedBy: identity.userId, reason });
  await ordersRepository.updateStatus(orderId, "refund_requested");
  return refundRequest;
};

/**
 * @param {string} refundRequestId
 * @param {{ sub: string, role: string }} reviewer
 */
const loadForReview = async (refundRequestId, reviewer) => {
  const refundRequest = await refundRequestsRepository.findById(refundRequestId);
  if (!refundRequest) throw notFound("REFUND_REQUEST_NOT_FOUND", "Refund request not found");

  const order = await ordersRepository.findById(refundRequest.order_id);
  const event = await eventsRepository.findById(order.event_id);
  assertEventOwnerOrSuperAdmin(event, reviewer);

  return { refundRequest, order };
};

/**
 * @param {string} refundRequestId
 * @param {{ sub: string, role: string }} reviewer
 * @param {string} [notes]
 */
export const approve = async (refundRequestId, reviewer, notes) => {
  const { refundRequest } = await loadForReview(refundRequestId, reviewer);
  if (refundRequest.status !== "requested") {
    throw conflict("ALREADY_DECIDED", `Refund request is already "${refundRequest.status}"`);
  }

  await refundRequestsRepository.decide(refundRequestId, { status: "approved", processedBy: reviewer.sub, notes });
  return refundRequestsRepository.findById(refundRequestId);
};

/**
 * @param {string} refundRequestId
 * @param {{ sub: string, role: string }} reviewer
 * @param {string} [notes]
 */
export const reject = async (refundRequestId, reviewer, notes) => {
  const { refundRequest, order } = await loadForReview(refundRequestId, reviewer);
  if (refundRequest.status !== "requested") {
    throw conflict("ALREADY_DECIDED", `Refund request is already "${refundRequest.status}"`);
  }

  await refundRequestsRepository.decide(refundRequestId, { status: "rejected", processedBy: reviewer.sub, notes });
  await ordersRepository.updateStatus(order.id, "refund_rejected");
  return refundRequestsRepository.findById(refundRequestId);
};

/**
 * Marks a refund as actually paid back to the buyer (offline bank
 * transfer), voids any still-`issued` tickets on the order so they can no
 * longer be scanned in, and closes out the order as `refunded`.
 * @param {string} refundRequestId
 * @param {{ sub: string, role: string }} reviewer
 * @param {string} [notes]
 */
export const markCompleted = async (refundRequestId, reviewer, notes) => {
  const { refundRequest, order } = await loadForReview(refundRequestId, reviewer);
  if (refundRequest.status !== "approved") {
    throw conflict("NOT_APPROVED_YET", 'Only an "approved" refund request can be marked completed');
  }

  await db.transaction(async (trx) => {
    await refundRequestsRepository.decide(refundRequestId, { status: "completed", processedBy: reviewer.sub, notes }, trx);
    await ordersRepository.updateStatus(order.id, "refunded", trx);
    await ticketsRepository.voidIssuedTicketsForOrder(order.id, trx);
  });

  return refundRequestsRepository.findById(refundRequestId);
};

/**
 * @param {string} orderId
 * @param {{ sub: string, role: string }} requester
 */
export const listForOrder = async (orderId, requester) => {
  const order = await ordersRepository.findById(orderId);
  if (!order) throw notFound("ORDER_NOT_FOUND", "Order not found");

  const event = await eventsRepository.findById(order.event_id);
  const isOwnOrder = order.user_id === requester.sub;
  const isEventOwnerOrSuperAdmin = requester.role === "super_admin" || event.owner_id === requester.sub;
  if (!isOwnOrder && !isEventOwnerOrSuperAdmin) throw forbidden("NOT_ORDER_OWNER", "You do not have access to this order");

  return refundRequestsRepository.listByOrder(orderId);
};

/** @param {string} ownerId */
export const listForEventOwner = (ownerId) => refundRequestsRepository.listForEventOwner(ownerId);
