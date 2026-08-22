import { db } from "../config/db.js";

const TABLE = "region_cache";

/**
 * mysql2 hands JSON columns back as strings — parse defensively (an already
 * parsed value passes through), same convention as product-embeddings.
 * @param {unknown} value
 */
const parsePayload = (value) => (typeof value === "string" ? JSON.parse(value) : value);

/**
 * @param {string} cacheKey - e.g. `"provinces"`, `"regencies:31"`, `"villages:317205"`
 * @returns {Promise<{ payload: object[], fetchedAt: Date } | null>}
 */
export const find = async (cacheKey) => {
  const row = await db(TABLE).where({ cache_key: cacheKey }).first();
  if (!row) return null;
  return { payload: parsePayload(row.payload), fetchedAt: row.fetched_at };
};

/**
 * Creates or refreshes one cached region list.
 * @param {string} cacheKey
 * @param {object[]} payload - the full list as returned by api.co.id
 */
export const save = async (cacheKey, payload) => {
  await db(TABLE)
    .insert({ cache_key: cacheKey, payload: JSON.stringify(payload), fetched_at: new Date() })
    .onConflict("cache_key")
    .merge();
};
