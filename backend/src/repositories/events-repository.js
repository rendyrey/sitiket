import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "events";

const withCategory = (query) =>
  query
    .leftJoin("event_categories", "event_categories.id", "events.category_id")
    .select(
      "events.*",
      "event_categories.name as category_name",
      "event_categories.slug as category_slug",
    );

/**
 * @param {string} id
 * @param {import("knex").Knex} [executor]
 */
export const findById = (id, executor = db) => withCategory(executor(TABLE)).where("events.id", id).first();

/** @param {string} slug */
export const findBySlug = (slug) => withCategory(db(TABLE)).where("events.slug", slug).first();

/**
 * @param {object} filters
 * @param {string} [filters.categorySlug]
 * @param {string} [filters.city]
 * @param {string} [filters.search] - matches against event name
 * @param {string} [filters.status]
 * @param {string} [filters.ownerId]
 * @param {boolean} [filters.publicOnly] - restrict to status=published AND is_visible=true (the default, unauthenticated catalog view)
 * @param {number} [filters.page]
 * @param {number} [filters.pageSize]
 */
export const list = async ({
  categorySlug,
  city,
  search,
  status,
  ownerId,
  publicOnly = false,
  page = 1,
  pageSize = 20,
} = {}) => {
  const applyFilters = (query) => {
    if (publicOnly) query.where("events.status", "published").andWhere("events.is_visible", true);
    if (status) query.where("events.status", status);
    if (ownerId) query.where("events.owner_id", ownerId);
    if (city) query.where("events.city", city);
    if (categorySlug) query.where("event_categories.slug", categorySlug);
    if (search) query.whereILike("events.name", `%${search}%`);
    return query;
  };

  const [{ total }] = await applyFilters(
    db(TABLE).leftJoin("event_categories", "event_categories.id", "events.category_id"),
  ).count({ total: "events.id" });

  const rows = await applyFilters(withCategory(db(TABLE)))
    .orderBy("events.start_date", "asc")
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total: Number(total), page, pageSize };
};

/**
 * @param {object} input - camelCase event fields (see schemas/event-schemas.js)
 * @returns {Promise<object>} the created event row
 */
export const create = async (input) => {
  const id = newId();
  const now = new Date();

  await db(TABLE).insert({
    id,
    owner_id: input.ownerId,
    category_id: input.categoryId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    status: "draft",
    is_visible: true,
    start_date: input.startDate,
    end_date: input.endDate,
    venue_name: input.venueName ?? null,
    address: input.address ?? null,
    city: input.city ?? null,
    province: input.province ?? null,
    country: input.country ?? "Indonesia",
    meeting_url: input.meetingUrl ?? null,
    meeting_platform: input.meetingPlatform ?? null,
    contact_person_name: input.contactPersonName,
    contact_person_email: input.contactPersonEmail,
    contact_person_phone: input.contactPersonPhone,
    bank_account_id: input.bankAccountId ?? null,
    max_tickets_per_user: input.maxTicketsPerUser ?? 10,
    created_at: now,
    updated_at: now,
  });

  return findById(id);
};

/**
 * @param {string} id
 * @param {object} patch - camelCase fields to change
 */
export const update = async (id, patch) => {
  const changes = { updated_at: new Date() };
  const fieldMap = {
    categoryId: "category_id",
    name: "name",
    description: "description",
    startDate: "start_date",
    endDate: "end_date",
    venueName: "venue_name",
    address: "address",
    city: "city",
    province: "province",
    country: "country",
    meetingUrl: "meeting_url",
    meetingPlatform: "meeting_platform",
    contactPersonName: "contact_person_name",
    contactPersonEmail: "contact_person_email",
    contactPersonPhone: "contact_person_phone",
    bankAccountId: "bank_account_id",
    maxTicketsPerUser: "max_tickets_per_user",
  };

  for (const [key, column] of Object.entries(fieldMap)) {
    if (patch[key] !== undefined) changes[column] = patch[key];
  }

  await db(TABLE).where({ id }).update(changes);
  return findById(id);
};

/** @param {string} id @param {"draft" | "published" | "cancelled" | "completed"} status */
export const updateStatus = (id, status) => db(TABLE).where({ id }).update({ status, updated_at: new Date() });

/** @param {string} id @param {boolean} isVisible */
export const updateVisibility = (id, isVisible) =>
  db(TABLE).where({ id }).update({ is_visible: isVisible, updated_at: new Date() });
