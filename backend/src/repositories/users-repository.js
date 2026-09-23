import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "users";

/** @param {string} googleSub */
export const findByGoogleSub = (googleSub) => db(TABLE).where({ google_sub: googleSub }).first();

/** @param {string} email */
export const findByEmail = (email) => db(TABLE).where({ email }).first();

/** `users.phone` with the separators people type (+ - space . parentheses) stripped, as SQL. */
const STRIPPED_PHONE_SQL =
  "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), '-', ''), ' ', ''), '.', ''), '(', ''), ')', '')";

/**
 * Active accounts whose saved phone is this WhatsApp number in any common
 * format ("62812…", "+62 812-…", "0812…") — how the WhatsApp bot recognises
 * who is chatting. Callers still re-check each row with utils/phone.js
 * `toWhatsappId` (the SQL is only the candidate filter).
 * ponytail: unindexed expression scan over users; add a normalized, indexed column past ~100k users.
 *
 * @param {string} waId - digits with country code. Example: `"628112003717"`
 * @returns {Promise<object[]>} matching `users` rows (usually 0 or 1)
 */
export const findActiveByWhatsappId = (waId) => {
  const candidates = waId.startsWith("62") ? [waId, `0${waId.slice(2)}`] : [waId];
  return db(TABLE)
    .where({ status: "active" })
    .whereRaw(`${STRIPPED_PHONE_SQL} IN (${candidates.map(() => "?").join(", ")})`, candidates);
};

/**
 * @param {string} id
 * @param {import("knex").Knex} [executor] - pass an open transaction to read inside it; defaults to the pool.
 */
export const findById = (id, executor = db) => executor(TABLE).where({ id }).first();

/**
 * @param {{ googleSub: string, email: string, name: string, avatarUrl?: string, emailVerified: boolean }} input
 * @returns {Promise<object>} the created user row
 */
export const create = async ({ googleSub, email, name, avatarUrl, emailVerified }) => {
  const id = newId();
  const now = new Date();
  await db(TABLE).insert({
    id,
    google_sub: googleSub,
    email,
    name,
    avatar_url: avatarUrl ?? null,
    email_verified_at: emailVerified ? now : null,
    role: "user",
    status: "active",
    created_at: now,
    updated_at: now,
  });
  return findById(id);
};

/**
 * @param {{ page?: number, pageSize?: number, role?: string, status?: string }} filters
 */
export const list = async ({ page = 1, pageSize = 20, role, status } = {}) => {
  const query = db(TABLE);
  if (role) query.where({ role });
  if (status) query.where({ status });

  const countQuery = query.clone();
  const [{ total }] = await countQuery.count({ total: "*" });

  const rows = await query
    .clone()
    .orderBy("created_at", "desc")
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total: Number(total), page, pageSize };
};

/** @param {"user" | "admin" | "super_admin"} role */
export const listByRole = (role) => db(TABLE).where({ role });

/**
 * @param {string} id
 * @param {"user" | "admin" | "super_admin"} role
 * @param {import("knex").Knex} [executor] - pass an open transaction to keep this atomic with a related write.
 */
export const updateRole = (id, role, executor = db) =>
  executor(TABLE).where({ id }).update({ role, updated_at: new Date() });

/**
 * @param {string} id
 * @param {"active" | "suspended"} status
 */
export const updateStatus = (id, status) => db(TABLE).where({ id }).update({ status, updated_at: new Date() });

/**
 * @param {string} id
 * @param {string} phone
 */
export const updatePhone = (id, phone) => db(TABLE).where({ id }).update({ phone, updated_at: new Date() });

/**
 * Self-service profile fields (contact + delivery address for merch checkout).
 * Region names/codes always arrive together, resolved server-side from the
 * chosen api.co.id village (controllers/auth-controller.js `updateMe`).
 * @param {string} id
 * @param {{ phone?: string, address?: string, city?: string, province?: string, district?: string,
 *   village?: string, provinceCode?: string, cityCode?: string, districtCode?: string,
 *   villageCode?: string, postalCode?: string | null }} patch
 */
export const updateProfile = async (id, patch) => {
  const changes = { updated_at: new Date() };
  const fieldMap = {
    phone: "phone",
    address: "address",
    city: "city",
    province: "province",
    district: "district",
    village: "village",
    provinceCode: "province_code",
    cityCode: "city_code",
    districtCode: "district_code",
    villageCode: "village_code",
    postalCode: "postal_code",
  };
  for (const [key, column] of Object.entries(fieldMap)) {
    if (patch[key] !== undefined) changes[column] = patch[key];
  }
  await db(TABLE).where({ id }).update(changes);
  return findById(id);
};
