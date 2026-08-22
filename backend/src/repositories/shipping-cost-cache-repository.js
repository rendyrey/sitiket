import { db } from "../config/db.js";

const TABLE = "shipping_cost_cache";

/**
 * mysql2 hands JSON columns back as strings — parse defensively (an already
 * parsed value passes through), same convention as product-embeddings.
 * @param {unknown} value
 */
const parseCouriers = (value) => (typeof value === "string" ? JSON.parse(value) : value);

/**
 * @param {string} originVillageCode - 10-digit api.co.id village code
 * @param {string} destinationVillageCode
 * @param {number} weightKg - integer kg the quote was requested for
 * @returns {Promise<{ couriers: object[], fetchedAt: Date } | null>}
 */
export const find = async (originVillageCode, destinationVillageCode, weightKg) => {
  const row = await db(TABLE)
    .where({
      origin_village_code: originVillageCode,
      destination_village_code: destinationVillageCode,
      weight_kg: weightKg,
    })
    .first();
  if (!row) return null;
  return { couriers: parseCouriers(row.couriers), fetchedAt: row.fetched_at };
};

/**
 * Creates or refreshes the cached courier list for one (origin, destination,
 * weight) lane.
 * @param {string} originVillageCode
 * @param {string} destinationVillageCode
 * @param {number} weightKg
 * @param {object[]} couriers - as returned by api.co.id (`courier_code`, `courier_name`, `price`, `estimation`)
 */
export const save = async (originVillageCode, destinationVillageCode, weightKg, couriers) => {
  await db(TABLE)
    .insert({
      origin_village_code: originVillageCode,
      destination_village_code: destinationVillageCode,
      weight_kg: weightKg,
      couriers: JSON.stringify(couriers),
      fetched_at: new Date(),
    })
    .onConflict(["origin_village_code", "destination_village_code", "weight_kg"])
    .merge();
};
