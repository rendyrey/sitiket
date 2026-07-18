import { db } from "../config/db.js";
import { env } from "../config/env.js";
import { resolveForEvent as resolveBankAccountForEvent } from "./bank-account-service.js";
import * as orderItemsRepository from "../repositories/order-items-repository.js";
import * as ordersRepository from "../repositories/orders-repository.js";
import * as ticketTypesRepository from "../repositories/ticket-types-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { calculateDiscount, validateForOrder as validatePromoCodeForOrder } from "./promo-code-service.js";
import * as promoCodesRepository from "../repositories/promo-codes-repository.js";
import * as eventsRepository from "../repositories/events-repository.js";
import { requestGuestOtp } from "./email-verification-service.js";
import { notifyOrderCancelled, notifyOrderExpired } from "./notification-service.js";
import { assertEventOwnerOrSuperAdmin } from "../utils/authorize-event-owner.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/http-error.js";

/**
 * Creates a checkout order: validates the event/ticket types are on sale,
 * enforces the event's per-buyer ticket cap, atomically reserves inventory
 * (and a promo code use, if any) so overselling is impossible even under
 * concurrent checkouts, and — for guest buyers — starts the email
 * verification an order must clear before payment. See
 * docs/business/PAYMENT_VERIFICATION.md and DATABASE_DESIGN.md §5.
 *
 * @param {{ sub: string, email: string } | null} requester - `null` for guest checkout
 * @param {{
 *   eventId: string,
 *   items: Array<{ ticketTypeId: string, quantity: number }>,
 *   promoCode?: string,
 *   buyerName: string,
 *   buyerEmail: string,
 *   buyerPhone: string,
 * }} input
 * @returns {Promise<{ order: object, devOtpCode?: string }>}
 */
export const createOrder = async (requester, input) => {
  const event = await eventsRepository.findById(input.eventId);
  if (!event || event.status !== "published" || !event.is_visible) {
    throw notFound("EVENT_NOT_PURCHASABLE", "Event is not open for ticket sales");
  }

  // A logged-in buyer's identity is always their own verified account email —
  // never a client-supplied value — so the per-user cap and ticket delivery
  // can't be spoofed by typing someone else's address.
  let buyerUserId = null;
  let buyerEmail = input.buyerEmail;
  if (requester) {
    const user = await usersRepository.findById(requester.sub);
    buyerUserId = user.id;
    buyerEmail = user.email;
  }

  const requestedQuantity = input.items.reduce((sum, item) => sum + item.quantity, 0);
  const alreadyHeld = await ordersRepository.sumActiveTicketQuantityForBuyer(input.eventId, {
    userId: buyerUserId,
    buyerEmail,
  });
  if (alreadyHeld + requestedQuantity > event.max_tickets_per_user) {
    throw conflict(
      "TICKET_LIMIT_EXCEEDED",
      `This event allows at most ${event.max_tickets_per_user} tickets per buyer (already holding ${alreadyHeld})`,
    );
  }

  const ticketTypes = await Promise.all(input.items.map((item) => ticketTypesRepository.findById(item.ticketTypeId)));
  const now = new Date();
  ticketTypes.forEach((ticketType, index) => {
    const item = input.items[index];
    if (!ticketType || ticketType.event_id !== input.eventId || !ticketType.is_active) {
      throw badRequest("INVALID_TICKET_TYPE", `Ticket type ${item.ticketTypeId} is not available for this event`);
    }
    if (ticketType.sale_start_at && now < new Date(ticketType.sale_start_at)) {
      throw badRequest("TICKET_TYPE_NOT_ON_SALE", `"${ticketType.name}" is not on sale yet`);
    }
    if (ticketType.sale_end_at && now > new Date(ticketType.sale_end_at)) {
      throw badRequest("TICKET_TYPE_NOT_ON_SALE", `"${ticketType.name}" sale has ended`);
    }
  });

  const subtotalAmount = ticketTypes.reduce((sum, ticketType, index) => sum + ticketType.price * input.items[index].quantity, 0);

  let promoCode = null;
  let discountAmount = 0;
  if (input.promoCode) {
    promoCode = await validatePromoCodeForOrder(input.eventId, input.promoCode);
    discountAmount = calculateDiscount(promoCode, subtotalAmount);
  }

  // Fails fast if the organizer has no payout account configured — checked here,
  // before reserving inventory, and again by order-payment-service at proof-submission time.
  await resolveBankAccountForEvent(event);

  const orderId = await db.transaction(async (trx) => {
    for (let index = 0; index < ticketTypes.length; index += 1) {
      const reserved = await ticketTypesRepository.reserveInventory(ticketTypes[index].id, input.items[index].quantity, trx);
      if (!reserved) {
        throw conflict("SOLD_OUT", `"${ticketTypes[index].name}" no longer has enough stock`);
      }
    }

    if (promoCode) {
      const consumed = await promoCodesRepository.incrementUsage(promoCode.id, trx);
      if (!consumed) throw conflict("PROMO_CODE_EXHAUSTED", "Promo code has reached its usage limit");
    }

    const id = await ordersRepository.create(
      {
        eventId: input.eventId,
        userId: buyerUserId,
        buyerName: input.buyerName,
        buyerEmail,
        buyerPhone: input.buyerPhone,
        promoCodeId: promoCode?.id,
        subtotalAmount,
        discountAmount,
        totalAmount: subtotalAmount - discountAmount,
        paymentExpiresAt: new Date(Date.now() + env.ORDER_PAYMENT_HOLD_MINUTES * 60 * 1000),
      },
      trx,
    );

    await orderItemsRepository.createMany(
      ticketTypes.map((ticketType, index) => ({
        ticketTypeId: ticketType.id,
        quantity: input.items[index].quantity,
        unitPrice: ticketType.price,
      })),
      id,
      trx,
    );

    return id;
  });

  let devOtpCode;
  if (!requester) {
    const otpResult = await requestGuestOtp(orderId, buyerEmail);
    devOtpCode = otpResult.devCode;
  }

  return { order: await getOrderWithItems(orderId), devOtpCode };
};

/** @param {string} orderId */
export const getOrderWithItems = async (orderId) => {
  const order = await ordersRepository.findById(orderId);
  if (!order) throw notFound("ORDER_NOT_FOUND", "Order not found");
  const items = await orderItemsRepository.listByOrder(orderId);
  return { ...order, items };
};

/**
 * @param {string} orderId
 * @param {{ sub: string, role: string }} requester
 */
export const getOrderForViewer = async (orderId, requester) => {
  const order = await getOrderWithItems(orderId);
  const isOwnOrder = order.user_id === requester.sub;
  const isEventOwnerOrSuperAdmin = requester.role === "super_admin" || (await isEventOwner(order.event_id, requester.sub));
  if (!isOwnOrder && !isEventOwnerOrSuperAdmin) {
    throw forbidden("NOT_ORDER_OWNER", "You do not have access to this order");
  }
  return order;
};

const isEventOwner = async (eventId, userId) => {
  const event = await eventsRepository.findById(eventId);
  return event?.owner_id === userId;
};

/**
 * Guest order lookup by id + the email it was placed with — guests have no
 * session, so this pair stands in for authentication on this one endpoint.
 * @param {string} orderId
 * @param {string} email
 */
export const getOrderForGuest = async (orderId, email) => {
  const order = await getOrderWithItems(orderId);
  if (order.user_id || order.buyer_email !== email) {
    throw notFound("ORDER_NOT_FOUND", "Order not found");
  }
  return order;
};

/** @param {string} userId */
export const listMyOrders = (userId) => ordersRepository.listByUser(userId);

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 */
export const listOrdersForEvent = async (eventId, requester) => {
  const event = await eventsRepository.findById(eventId);
  if (!event) throw notFound("EVENT_NOT_FOUND", "Event not found");
  assertEventOwnerOrSuperAdmin(event, requester);
  return ordersRepository.listByEvent(eventId);
};

/**
 * Releases an order's held inventory/promo use and marks it cancelled or
 * expired. Shared by explicit cancellation and the stale-order sweep.
 * @param {object} order - an `orders` row
 * @param {"cancelled" | "expired"} status
 */
const releaseOrder = async (order, status) => {
  const items = await orderItemsRepository.listByOrder(order.id);
  await db.transaction(async (trx) => {
    for (const item of items) {
      await ticketTypesRepository.releaseInventory(item.ticket_type_id, item.quantity, trx);
    }
    if (order.promo_code_id) {
      await promoCodesRepository.decrementUsage(order.promo_code_id, trx);
    }
    await ordersRepository.updateStatus(order.id, status, trx);
  });

  if (status === "cancelled") {
    await notifyOrderCancelled(order);
  } else {
    await notifyOrderExpired(order);
  }
};

/**
 * @param {string} orderId
 * @param {{ sub: string, role: string }} requester
 */
export const cancelOrder = async (orderId, requester) => {
  const order = await ordersRepository.findById(orderId);
  if (!order) throw notFound("ORDER_NOT_FOUND", "Order not found");

  const isOwnOrder = order.user_id === requester.sub;
  const isEventOwnerOrSuperAdmin = requester.role === "super_admin" || (await isEventOwner(order.event_id, requester.sub));
  if (!isOwnOrder && !isEventOwnerOrSuperAdmin) throw forbidden("NOT_ORDER_OWNER", "You do not have access to this order");

  if (!["pending_payment", "awaiting_verification"].includes(order.status)) {
    throw conflict("ORDER_NOT_CANCELLABLE", `Order is already "${order.status}"`);
  }

  await releaseOrder(order, "cancelled");
  return ordersRepository.findById(orderId);
};

/**
 * Sweeps orders whose payment hold expired with no proof ever submitted,
 * releasing their reserved inventory/promo use. Intended to run on an
 * interval — see server.js.
 */
export const expireStalePendingOrders = async () => {
  const expired = await ordersRepository.findExpiredPendingOrders();
  for (const order of expired) {
    await releaseOrder(order, "expired");
  }
  return expired.length;
};
