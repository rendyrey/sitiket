import * as emailVerificationService from "../services/email-verification-service.js";
import * as orderService from "../services/order-service.js";
import * as ticketsRepository from "../repositories/tickets-repository.js";
import { toPublicOrder, toPublicTicket } from "../utils/presenters.js";

/** POST /api/orders — guest or logged-in checkout. */
export const create = async (request, response) => {
  const requester = request.user ? { sub: request.user.sub, email: request.user.email } : null;
  const { order, devOtpCode } = await orderService.createOrder(requester, request.body);
  response.status(201).json({ data: toPublicOrder(order), meta: devOtpCode ? { devOtpCode } : undefined });
};

/** POST /api/orders/:id/verify-guest-email */
export const verifyGuestEmail = async (request, response) => {
  await emailVerificationService.verifyGuestOtp(request.params.id, request.body.code);
  response.status(200).json({ data: toPublicOrder(await orderService.getOrderWithItems(request.params.id)) });
};

/** GET /api/orders/mine — the current user's purchase history. */
export const listMine = async (request, response) => {
  const orders = await orderService.listMyOrders(request.user.sub);
  response.status(200).json({ data: orders.map(toPublicOrder) });
};

/** GET /api/orders/:id — buyer, event owner, or super_admin. */
export const getById = async (request, response) => {
  const order = await orderService.getOrderForViewer(request.params.id, request.user);
  const tickets = await ticketsRepository.listByOrderWithContext(order.id);
  response.status(200).json({ data: { ...toPublicOrder(order), tickets: tickets.map(toPublicTicket) } });
};

/**
 * GET /api/orders/:id/guest?email=... — guest order lookup without a
 * session. Includes tickets once paid: with no email-delivery provider
 * wired up yet (see BACKEND.md), this endpoint is currently a guest's only
 * way to retrieve their QR codes after purchase.
 */
export const getForGuest = async (request, response) => {
  const order = await orderService.getOrderForGuest(request.params.id, request.query.email);
  const tickets = await ticketsRepository.listByOrderWithContext(order.id);
  response.status(200).json({ data: { ...toPublicOrder(order), tickets: tickets.map(toPublicTicket) } });
};

/** POST /api/orders/:id/cancel */
export const cancel = async (request, response) => {
  const order = await orderService.cancelOrder(request.params.id, request.user);
  response.status(200).json({ data: toPublicOrder(order) });
};

/** GET /api/events/:eventId/orders — event owner/super_admin, buyer list for one event. */
export const listForEvent = async (request, response) => {
  const orders = await orderService.listOrdersForEvent(request.params.eventId, request.user);
  response.status(200).json({ data: orders.map(toPublicOrder) });
};
