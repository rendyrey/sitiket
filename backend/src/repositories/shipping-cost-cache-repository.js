import { db } from "../config/db.js";

const TABLE = "shipping_cost_cache";

/**
 * mysql2 hands JSON columns back as strings — parse defensively (an already
 * parsed value passes through), same convention as product-embeddings.
 * @param {unknown} value
 */
const parseCouriers = (value) => (typeof value === "string" ? JSON.parse(value) : value);

/**
 * @param {string} originDistrictCode - 6-digit api.co.id district code
 * @param {string} destinationDistrictCode
 * @param {number} weightKg - integer kg the quote was requested for
 * @returns {Promise<{ couriers: object[], fetchedAt: Date } | null>}
 */
export const find = async (originDistrictCode, destinationDistrictCode, weightKg) => {
  const row = await db(TABLE)
    .where({
      origin_district_code: originDistrictCode,
      destination_district_code: destinationDistrictCode,
      weight_kg: weightKg,
    })
    .first();
  if (!row) return null;
  return { couriers: parseCouriers(row.couriers), fetchedAt: row.fetched_at };
};

/**
 * Creates or refreshes the cached courier list for one (origin, destination,
 * weight) lane.
 * @param {string} originDistrictCode
 * @param {string} destinationDistrictCode
 * @param {number} weightKg
 * @param {object[]} couriers - collapsed v2 options (`courier_code`, `courier_name`, `price`, `estimation`)
 */
export const save = async (originDistrictCode, destinationDistrictCode, weightKg, couriers) => {
  await db(TABLE)
    .insert({
      origin_district_code: originDistrictCode,
      destination_district_code: destinationDistrictCode,
      weight_kg: weightKg,
      couriers: JSON.stringify(couriers),
      fetched_at: new Date(),
    })
    .onConflict(["origin_district_code", "destination_district_code", "weight_kg"])
    .merge();
};
