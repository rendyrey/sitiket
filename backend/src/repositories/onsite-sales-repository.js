import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "onsite_ticket_sales";

/** An event's door-sale entries, newest first, with tier + recorder names for the tally list. */
export const listByEvent = (eventId) =>
  db(TABLE)
    // Qualified — ticket_types has its own event_id column.
    .where(`${TABLE}.event_id`, eventId)
    .join("ticket_types", "ticket_types.id", `${TABLE}.ticket_type_id`)
    .leftJoin("users", "users.id", `${TABLE}.recorded_by`)
    .orderBy(`${TABLE}.created_at`, "desc")
    .select(`${TABLE}.*`, "ticket_types.name as ticket_type_name", "users.name as recorded_by_name");

/** @param {string} id */
export const findById = (id) => db(TABLE).where({ id }).first();

/** @param {{ eventId: string, ticketTypeId: string, quantity: number, unitPrice: number, note?: string, recordedBy: string }} input */
export const create = async ({ eventId, ticketTypeId, quantity, unitPrice, note, recordedBy }) => {
  const id = newId();
  await db(TABLE).insert({
    id,
    event_id: eventId,
    ticket_type_id: ticketTypeId,
    quantity,
    unit_price: unitPrice,
    note: note ?? null,
    recorded_by: recordedBy,
    created_at: new Date(),
  });
  return findById(id);
};

/** @param {string} id */
export const remove = (id) => db(TABLE).where({ id }).delete();

/**
 * Door-sale totals for the attendance report.
 * @param {string} eventId
 * @returns {Promise<{ sold: number, revenue: number }>}
 */
export const getTotals = async (eventId) => {
  const [row] = await db(TABLE)
    .where({ event_id: eventId })
    .select(db.raw("COALESCE(SUM(quantity), 0) as sold"), db.raw("COALESCE(SUM(quantity * unit_price), 0) as revenue"));
  return { sold: Number(row.sold), revenue: Number(row.revenue) };
};
