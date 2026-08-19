import { db } from "../config/db.js";

/**
 * Aggregate queries behind the organizer's "Attendance" dashboard — how many
 * tickets an event sold versus how many people actually walked through the
 * gate.
 *
 * Ticket lifecycle (see repositories/tickets-repository.js):
 *   issued -> the buyer paid and holds a valid ticket, but has not arrived
 *   used   -> scanned at the gate (`checked_in_at` / `checked_in_by` are set)
 *   void   -> refunded after issue; it can never admit anyone
 *
 * So a ticket that still counts as a live sale is `issued` OR `used`, and
 * attendance is the `used` share of that. `void` is reported separately rather
 * than folded into either side — counting refunds as no-shows would understate
 * attendance, and counting them as sales would overstate it.
 */

const LIVE_STATUSES = ["issued", "used"];

/** Every ticket for an event, joined back to the order that produced it. */
const eventTickets = (eventId, executor = db) =>
  executor("tickets")
    .join("order_items", "order_items.id", "tickets.order_item_id")
    .join("orders", "orders.id", "order_items.order_id")
    .where("orders.event_id", eventId);

/**
 * Headline counts: live tickets sold, how many were scanned, and how many were
 * voided by a refund.
 * @param {string} eventId
 * @returns {Promise<{ sold: number, checkedIn: number, voided: number }>}
 */
export const getTotals = async (eventId) => {
  const rows = await eventTickets(eventId).select("tickets.status").count({ total: "*" }).groupBy("tickets.status");

  const countFor = (status) => Number(rows.find((row) => row.status === status)?.total ?? 0);
  const issued = countFor("issued");
  const checkedIn = countFor("used");

  return { sold: issued + checkedIn, checkedIn, voided: countFor("void") };
};

/**
 * Sold vs. scanned split per ticket type — the "which tier actually showed up"
 * breakdown. Ordered by price so the chart reads in the same order as the
 * public ticket list.
 * @param {string} eventId
 */
export const getByTicketType = async (eventId) => {
  const rows = await eventTickets(eventId)
    .join("ticket_types", "ticket_types.id", "order_items.ticket_type_id")
    .whereIn("tickets.status", LIVE_STATUSES)
    .select("ticket_types.id", "ticket_types.name", "ticket_types.price")
    .count({ sold: "*" })
    .sum({ checked_in: db.raw("CASE WHEN tickets.status = 'used' THEN 1 ELSE 0 END") })
    .groupBy("ticket_types.id", "ticket_types.name", "ticket_types.price")
    .orderBy("ticket_types.price", "asc");

  return rows.map((row) => ({
    ticketTypeId: row.id,
    name: row.name,
    price: Number(row.price),
    sold: Number(row.sold),
    checkedIn: Number(row.checked_in ?? 0),
  }));
};

/**
 * Raw check-in timestamps, ascending. Only the column the arrivals chart needs
 * — the service buckets these into intervals rather than shipping one row per
 * attendee to the browser.
 * @param {string} eventId
 * @returns {Promise<Date[]>}
 */
export const listCheckInTimes = async (eventId) => {
  const rows = await eventTickets(eventId)
    .where("tickets.status", "used")
    .whereNotNull("tickets.checked_in_at")
    .select("tickets.checked_in_at")
    .orderBy("tickets.checked_in_at", "asc");

  return rows.map((row) => row.checked_in_at);
};

/**
 * Scans per gate-staff account, busiest first. `checked_in_by` is a user id;
 * left-joined to `users` so a deleted staff account still reports its count
 * instead of dropping the scans from the total.
 * @param {string} eventId
 */
export const getByScanner = async (eventId) => {
  const rows = await eventTickets(eventId)
    .leftJoin("users", "users.id", "tickets.checked_in_by")
    .where("tickets.status", "used")
    .select("tickets.checked_in_by", "users.name", "users.email")
    .count({ scans: "*" })
    .groupBy("tickets.checked_in_by", "users.name", "users.email")
    .orderBy("scans", "desc");

  return rows.map((row) => ({
    userId: row.checked_in_by,
    name: row.name ?? "Removed staff account",
    email: row.email ?? null,
    scans: Number(row.scans),
  }));
};

/**
 * Gross revenue from paid orders. Kept separate from the ticket counts because
 * it is an order-level sum — summing it alongside the ticket join would
 * multiply each order's total by its ticket count.
 * @param {string} eventId
 */
export const getPaidRevenue = async (eventId) => {
  const row = await db("orders").where({ event_id: eventId, status: "paid" }).sum({ total: "total_amount" }).first();
  return Number(row?.total ?? 0);
};
