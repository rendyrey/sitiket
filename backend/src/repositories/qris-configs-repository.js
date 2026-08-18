import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "qris_configs";

/** @param {string} ownerId */
export const findByOwner = (ownerId) => db(TABLE).where({ owner_id: ownerId }).first();

/**
 * Creates or replaces the owner's single QRIS config (one row per owner).
 * @param {string} ownerId
 * @param {{ merchantName: string, qrisImageUrl: string }} input
 */
export const upsert = async (ownerId, { merchantName, qrisImageUrl }) => {
  const now = new Date();
  const existing = await findByOwner(ownerId);

  if (existing) {
    await db(TABLE)
      .where({ id: existing.id })
      .update({ merchant_name: merchantName, qris_image_url: qrisImageUrl, updated_at: now });
    return findByOwner(ownerId);
  }

  await db(TABLE).insert({
    id: newId(),
    owner_id: ownerId,
    merchant_name: merchantName,
    qris_image_url: qrisImageUrl,
    created_at: now,
    updated_at: now,
  });
  return findByOwner(ownerId);
};

/** @param {string} ownerId */
export const removeByOwner = (ownerId) => db(TABLE).where({ owner_id: ownerId }).del();
