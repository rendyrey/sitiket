import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "ticket_check_ins";

/** @param {string} ticketId */
export const listByTicket = (ticketId) => db(TABLE).where({ ticket_id: ticketId }).orderBy("scanned_at", "desc");

/**
 * @param {{ ticketId: string, scannedBy: string, result: "success" | "duplicate" | "invalid" | "expired", deviceLabel?: string }} input
 */
export const create = async (input) => {
  const id = newId();
  const now = new Date();
  await db(TABLE).insert({
    id,
    ticket_id: input.ticketId,
    scanned_by: input.scannedBy,
    scanned_at: now,
    result: input.result,
    device_label: input.deviceLabel ?? null,
    created_at: now,
  });
  return db(TABLE).where({ id }).first();
};
