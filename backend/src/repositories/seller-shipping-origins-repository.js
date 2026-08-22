import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "seller_shipping_origins";

/**
 * mysql2 hands JSON columns back as strings — parse `enabled_couriers`
 * defensively (an already parsed value passes through).
 * @param {object | undefined} row
 */
const parseRow = (row) => {
  if (!row) return row;
  return {
    ...row,
    enabled_couriers:
      typeof row.enabled_couriers === "string" ? JSON.parse(row.enabled_couriers) : (row.enabled_couriers ?? null),
  };
};

/** @param {string} ownerId */
export const findByOwner = async (ownerId) => parseRow(await db(TABLE).where({ owner_id: ownerId }).first());

/**
 * Creates or replaces the owner's single shipping departure address (one row
 * per owner, same shape as qris-configs-repository.js).
 * @param {string} ownerId
 * @param {{ address: string, province: string, city: string, district: string, village: string,
 *   provinceCode: string, cityCode: string, districtCode: string, villageCode: string,
 *   postalCode?: string | null, enabledCouriers?: string[] | null }} input - region names/codes
 *   resolved server-side from api.co.id; `enabledCouriers` null = all couriers offered
 */
export const upsert = async (ownerId, input) => {
  const now = new Date();
  const row = {
    address: input.address,
    province: input.province,
    city: input.city,
    district: input.district,
    village: input.village,
    province_code: input.provinceCode,
    city_code: input.cityCode,
    district_code: input.districtCode,
    village_code: input.villageCode,
    postal_code: input.postalCode ?? null,
    enabled_couriers: input.enabledCouriers?.length ? JSON.stringify(input.enabledCouriers) : null,
    updated_at: now,
  };

  const existing = await findByOwner(ownerId);
  if (existing) {
    await db(TABLE).where({ id: existing.id }).update(row);
    return findByOwner(ownerId);
  }

  await db(TABLE).insert({ id: newId(), owner_id: ownerId, created_at: now, ...row });
  return findByOwner(ownerId);
};
