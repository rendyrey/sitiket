import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "event_images";

/** @param {string} eventId */
export const listByEvent = (eventId) => db(TABLE).where({ event_id: eventId }).orderBy("sort_order", "asc");

/** @param {string} id */
export const findById = (id) => db(TABLE).where({ id }).first();

/** @param {string} eventId */
const countByEvent = async (eventId) => {
  const [{ total }] = await db(TABLE).where({ event_id: eventId }).count({ total: "*" });
  return Number(total);
};

/**
 * @param {{ eventId: string, imageUrl: string, isPoster: boolean, width: number, height: number }} input
 */
export const create = async ({ eventId, imageUrl, isPoster, width, height }) => {
  const id = newId();
  const sortOrder = await countByEvent(eventId);

  await db.transaction(async (trx) => {
    if (isPoster) {
      await trx(TABLE).where({ event_id: eventId }).update({ is_poster: false });
    }
    await trx(TABLE).insert({
      id,
      event_id: eventId,
      image_url: imageUrl,
      is_poster: isPoster,
      width,
      height,
      sort_order: sortOrder,
      created_at: new Date(),
    });
  });

  return findById(id);
};

/** @param {string} id */
export const remove = (id) => db(TABLE).where({ id }).delete();
