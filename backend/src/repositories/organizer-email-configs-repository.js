import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "organizer_email_configs";

/** @param {string} ownerId */
export const findByOwner = (ownerId) => db(TABLE).where({ owner_id: ownerId }).first();

/**
 * Creates or replaces the owner's single email config (one row per owner).
 * Exactly one credential is present per row: `smtpPasswordEncrypted` (custom
 * SMTP / legacy gmail App Password) or `googleRefreshTokenEncrypted`
 * ("Connect Gmail" OAuth) — the other is nulled so switching providers can't
 * leave a stale credential behind.
 * @param {string} ownerId
 * @param {{
 *   provider: "gmail" | "custom",
 *   smtpHost?: string | null,
 *   smtpPort?: number | null,
 *   smtpSecure?: boolean,
 *   fromEmail: string,
 *   fromName?: string | null,
 *   smtpPasswordEncrypted?: string | null,
 *   googleRefreshTokenEncrypted?: string | null,
 *   verifiedAt?: Date,
 * }} input
 */
export const upsert = async (ownerId, input) => {
  const now = new Date();
  const row = {
    provider: input.provider,
    smtp_host: input.smtpHost ?? null,
    smtp_port: input.smtpPort ?? null,
    smtp_secure: input.smtpSecure ?? true,
    from_email: input.fromEmail,
    from_name: input.fromName ?? null,
    smtp_password_encrypted: input.smtpPasswordEncrypted ?? null,
    google_refresh_token_encrypted: input.googleRefreshTokenEncrypted ?? null,
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
