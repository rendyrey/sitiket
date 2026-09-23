import { db } from "../config/db.js";

const TABLE = "telegram_contacts";

/**
 * Stores (or replaces) the phone a Telegram user shared with the bot.
 * @param {string} telegramUserId - Example: `"123456789"`
 * @param {string} phone - digits with country code. Example: `"628112003717"`
 */
export const upsert = (telegramUserId, phone) =>
  db(TABLE)
    .insert({ telegram_user_id: telegramUserId, phone, created_at: new Date(), updated_at: new Date() })
    .onConflict("telegram_user_id")
    .merge({ phone, updated_at: new Date() });

/**
 * @param {string} telegramUserId - Example: `"123456789"`
 * @returns {Promise<string | null>} the shared phone, or null when never shared. Example: `"628112003717"`
 */
export const findPhone = async (telegramUserId) =>
  (await db(TABLE).where({ telegram_user_id: telegramUserId }).first())?.phone ?? null;
