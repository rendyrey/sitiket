import * as eventStaffRepository from "../repositories/event-staff-repository.js";
import * as eventsRepository from "../repositories/events-repository.js";
import * as orderItemsRepository from "../repositories/order-items-repository.js";
import * as ordersRepository from "../repositories/orders-repository.js";
import * as ticketCheckInsRepository from "../repositories/ticket-check-ins-repository.js";
import * as ticketsRepository from "../repositories/tickets-repository.js";
import { db } from "../config/db.js";
import { forbidden, notFound } from "../utils/http-error.js";
import { newTicketCode } from "../utils/id.js";
import { signQrPayload, verifyQrPayload } from "../utils/qr-token.js";

/**
 * Generates one `tickets` row (with its own signed QR) per purchased unit
 * — a 5-ticket order produces 5 independent rows. Called once an order's
 * payment proof is approved. See docs/business/CHECKIN_GATE_SYSTEM.md §2.
 * @param {string} orderId
 */
export const issueTicketsForOrder = async (orderId) => {
  const order = await ordersRepository.findById(orderId);
  const items = await orderItemsRepository.listByOrder(orderId);

  const rows = items.flatMap((item) =>
    Array.from({ length: item.quantity }, () => {
      const ticketCode = newTicketCode();
      return { orderItemId: item.id, ticketCode, qrPayload: signQrPayload({ ticketCode, eventId: order.event_id }) };
    }),
  );

  await db.transaction((trx) => ticketsRepository.createMany(rows, trx));
  return ticketsRepository.listByOrderWithContext(orderId);
};

/** @param {string} userId */
export const listMyTickets = (userId) => ticketsRepository.listByUserWithContext(userId);

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

  return ticketsRepository.listByOrderWithContext(orderId);
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @throws {import("../utils/http-error.js").HttpError} 403 unless the requester owns the event,
 *   is a super_admin, or is delegated `event_staff` for it.
 */
const assertCanScanEvent = async (eventId, requester) => {
  if (requester.role === "super_admin") return;

  const event = await eventsRepository.findById(eventId);
  if (event?.owner_id === requester.sub) return;

  const staffRow = await eventStaffRepository.findByEventAndUser(eventId, requester.sub);
  if (staffRow) return;

  throw forbidden("NOT_EVENT_STAFF", "Only the event owner, its delegated staff, or a super_admin can scan tickets");
};

/**
 * Validates and (on success) consumes a scanned QR at the gate. Every
 * attempt against a resolvable ticket is logged — including rejections —
 * so duplicate/fraudulent entry attempts can be investigated. See
 * docs/business/CHECKIN_GATE_SYSTEM.md §4-6.
 * @param {{ sub: string, role: string }} scanner
 * @param {{ qrPayload: string, deviceLabel?: string }} input
 * @returns {Promise<{ result: "success" | "duplicate" | "invalid" | "expired", ticket: object | null }>}
 */
export const scanTicket = async (scanner, { qrPayload, deviceLabel }) => {
  const decoded = verifyQrPayload(qrPayload);
  if (!decoded) return { result: "invalid", ticket: null };

  const ticket = await ticketsRepository.findByCodeWithContext(decoded.ticketCode);
  if (!ticket || ticket.event_id !== decoded.eventId) return { result: "invalid", ticket: null };

  await assertCanScanEvent(ticket.event_id, scanner);

  const event = await eventsRepository.findById(ticket.event_id);
  const now = new Date();

  let result;
  if (now < new Date(event.start_date) || now > new Date(event.end_date)) {
    result = "expired";
  } else if (ticket.status === "void") {
    result = "invalid";
  } else if (ticket.status === "used") {
    result = "duplicate";
  } else {
    const won = await ticketsRepository.markUsedIfIssued(ticket.id, scanner.sub);
    result = won ? "success" : "duplicate";
  }

  await ticketCheckInsRepository.create({ ticketId: ticket.id, scannedBy: scanner.sub, result, deviceLabel });

  return { result, ticket: await ticketsRepository.findByCodeWithContext(decoded.ticketCode) };
};
