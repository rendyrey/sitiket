import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "organizer_email_configs";

/** @param {string} ownerId */
export const findByOwner = (ownerId) => db(TABLE).where({ owner_id: ownerId }).first();

/**
 * Creates or replaces the owner's single email config (one row per owner).
 * @param {string} ownerId
 * @param {{
 *   provider: "gmail" | "custom",
 *   smtpHost: string,
 *   smtpPort: number,
 *   smtpSecure: boolean,
 *   fromEmail: string,
 *   fromName?: string,
 *   smtpPasswordEncrypted: string,
 *   verifiedAt?: Date,
 * }} input
 */
export const upsert = async (ownerId, input) => {
  const now = new Date();
  const row = {
    provider: input.provider,
    smtp_host: input.smtpHost,
    smtp_port: input.smtpPort,
    smtp_secure: input.smtpSecure,
    from_email: input.fromEmail,
    from_name: input.fromName ?? null,
    smtp_password_encrypted: input.smtpPasswordEncrypted,
    verified_at: input.verifiedAt ?? null,
    updated_at: now,
  };

  const existing = await findByOwner(ownerId);
  if (existing) {
    await db(TABLE).where({ id: existing.id }).update(row);
    return findByOwner(ownerId);
  }

  await db(TABLE).insert({ id: newId(), owner_id: ownerId, ...row, created_at: now });
  return findByOwner(ownerId);
};
