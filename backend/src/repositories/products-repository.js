import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "products";

/**
 * The price a catalog card shows and a price filter compares against: the
 * cheapest active variant when the product has variants, else the base price.
 * Kept as a raw SQL fragment because MySQL cannot reference a SELECT alias
 * inside WHERE, and the same expression must drive filtering, sorting, and
 * display so they always agree.
 */
const EFFECTIVE_PRICE_SQL = `COALESCE((SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = products.id AND pv.is_active = 1), products.price)`;

/** Remaining sellable units: active-variant stock when variants exist, else base stock. */
const STOCK_REMAINING_SQL = `COALESCE((SELECT SUM(pv.stock - pv.quantity_sold) FROM product_variants pv WHERE pv.product_id = products.id AND pv.is_active = 1), products.stock - products.quantity_sold)`;

const withCatalogColumns = (query) =>
  query
    .leftJoin("merch_categories", "merch_categories.id", "products.category_id")
    .select(
      "products.*",
      "merch_categories.name as category_name",
      "merch_categories.slug as category_slug",
      db.raw(
        `(SELECT pi.image_url FROM product_images pi WHERE pi.product_id = products.id ORDER BY pi.sort_order ASC, pi.created_at ASC LIMIT 1) as thumbnail_url`,
      ),
      db.raw(`${EFFECTIVE_PRICE_SQL} as effective_price`),
      db.raw(
        `(SELECT MAX(pv.price) FROM product_variants pv WHERE pv.product_id = products.id AND pv.is_active = 1) as max_variant_price`,
      ),
      db.raw(`${STOCK_REMAINING_SQL} as stock_remaining`),
      db.raw(
        `EXISTS(SELECT 1 FROM product_variants pv WHERE pv.product_id = products.id) as has_variants`,
      ),
    );

/**
 * @param {string} id
 * @param {import("knex").Knex} [executor]
 */
export const findById = (id, executor = db) =>
  withCatalogColumns(executor(TABLE)).where("products.id", id).whereNull("products.deleted_at").first();

/** @param {string} slug */
export const findBySlug = (slug) =>
  withCatalogColumns(db(TABLE)).where("products.slug", slug).whereNull("products.deleted_at").first();

/**
 * LIKE patterns that absorb one typo in a token:
 * - the token itself as a substring;
 * - the token with its final character dropped (plurals/trailing typos:
 *   "tees" still finds "Tee");
 * - the token with a single wildcard gap at every interior position
 *   (missing/extra middle characters: "bandng" still finds "Bandung" via
 *   `%band%ng%`).
 * @param {string} token
 */
const fuzzyPatterns = (token) => {
  const patterns = [`%${token}%`];
  if (token.length >= 4) {
    patterns.push(`%${token.slice(0, -1)}%`);
    for (let i = 2; i <= token.length - 2; i += 1) {
      patterns.push(`%${token.slice(0, i)}%${token.slice(i)}%`);
    }
  }
  return patterns;
};

/**
 * Public catalog listing — "semantic and fuzzy" search on the installed
 * stack: MySQL FULLTEXT natural-language relevance over name+description
 * (meaning-adjacent term weighting, not just prefix matching), OR-combined
 * with per-token typo-tolerant matches on the name (see {@link fuzzyPatterns}).
 * Results order by FULLTEXT relevance when searching, so exact/meaningful
 * matches always rank above fuzzy-only ones.
 *
 * @param {object} filters
 * @param {string} [filters.search]
 * @param {string} [filters.categorySlug]
 * @param {number} [filters.minPrice] - compared against the effective (cheapest-variant) price
 * @param {number} [filters.maxPrice]
 * @param {"newest" | "price_asc" | "price_desc"} [filters.sortBy]
 * @param {string[]} [filters.semanticIds] - embedding-based candidates for `search`,
 *   best first (services/embedding-service.js). OR-ed into the match set;
 *   ranking puts FULLTEXT relevance first, then semantic order.
 * @param {number} [filters.page]
 * @param {number} [filters.pageSize]
 */
export const searchCatalog = async ({
  search,
  categorySlug,
  minPrice,
  maxPrice,
  sortBy = "newest",
  semanticIds,
  page = 1,
  pageSize = 24,
} = {}) => {
  // Cap the fuzzy expansion — 5 tokens × ~1+len patterns keeps the OR list bounded.
  const tokens = search ? search.split(/\s+/).filter(Boolean).slice(0, 5) : [];

  const applyFilters = (query) => {
    query
      .whereNull("products.deleted_at")
      .where("products.is_active", true);
    if (categorySlug) query.where("merch_categories.slug", categorySlug);
    if (minPrice !== undefined) query.whereRaw(`${EFFECTIVE_PRICE_SQL} >= ?`, [minPrice]);
    if (maxPrice !== undefined) query.whereRaw(`${EFFECTIVE_PRICE_SQL} <= ?`, [maxPrice]);
    if (search) {
      query.where((builder) => {
        builder.whereRaw("MATCH(products.name, products.description) AGAINST (? IN NATURAL LANGUAGE MODE)", [search]);
        for (const token of tokens) {
          for (const pattern of fuzzyPatterns(token)) {
            builder.orWhereILike("products.name", pattern);
          }
        }
        if (semanticIds?.length) builder.orWhereIn("products.id", semanticIds);
      });
    }
    return query;
  };

  const [{ total }] = await applyFilters(
    db(TABLE).leftJoin("merch_categories", "merch_categories.id", "products.category_id"),
  ).count({ total: "products.id" });

  const query = applyFilters(withCatalogColumns(db(TABLE)));
  if (search) {
    query.orderByRaw("MATCH(products.name, products.description) AGAINST (? IN NATURAL LANGUAGE MODE) DESC", [search]);
    if (semanticIds?.length) {
      // Among equal keyword relevance (typically 0), semantic candidates rank
      // by similarity (their order in `semanticIds`); rows not in the list
      // (FIELD() = 0) sort after every ranked candidate.
      const placeholders = semanticIds.map(() => "?").join(", ");
      query.orderByRaw(
        `CASE WHEN FIELD(products.id, ${placeholders}) = 0 THEN ${semanticIds.length + 1} ELSE FIELD(products.id, ${placeholders}) END ASC`,
        [...semanticIds, ...semanticIds],
      );
    }
  }
  if (sortBy === "price_asc") query.orderByRaw(`${EFFECTIVE_PRICE_SQL} ASC`);
  else if (sortBy === "price_desc") query.orderByRaw(`${EFFECTIVE_PRICE_SQL} DESC`);
  else query.orderBy("products.created_at", "desc");

  const rows = await query.limit(pageSize).offset((page - 1) * pageSize);
  return { rows, total: Number(total), page, pageSize };
};

/**
 * Owner dashboard listing — includes units sold and revenue from PAID merch
 * orders (correlated subqueries, same technique as events-repository.js's
 * sales stats).
 * @param {string} ownerId
 */
export const listByOwner = (ownerId) => {
  const paidItems = () =>
    db("merch_order_items")
      .join("merch_orders", "merch_orders.id", "merch_order_items.merch_order_id")
      .where("merch_orders.status", "paid")
      .whereRaw("merch_order_items.product_id = products.id");

  return withCatalogColumns(db(TABLE))
    .select(
      db.raw(`COALESCE((${paidItems().sum({ total: "merch_order_items.quantity" }).toString()}), 0) as units_sold`),
      db.raw(`COALESCE((${paidItems().sum({ total: "merch_order_items.subtotal" }).toString()}), 0) as revenue`),
    )
    .where("products.owner_id", ownerId)
    .whereNull("products.deleted_at")
    .orderBy("products.created_at", "desc");
};

/**
 * @param {object} input - camelCase product fields (see schemas/product-schemas.js)
 * @returns {Promise<object>} the created product row
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
    price: input.price,
    stock: input.stock,
    quantity_sold: 0,
    is_active: true,
    created_at: now,
    updated_at: now,
  });
  return findById(id);
};

/** @param {string} id @param {object} patch - camelCase fields */
export const update = async (id, patch) => {
  const changes = { updated_at: new Date() };
  const fieldMap = {
    categoryId: "category_id",
    name: "name",
    description: "description",
    price: "price",
    stock: "stock",
    isActive: "is_active",
  };
  for (const [key, column] of Object.entries(fieldMap)) {
    if (patch[key] !== undefined) changes[column] = patch[key];
  }
  await db(TABLE).where({ id }).update(changes);
  return findById(id);
};

/** @param {string} id @param {boolean} isActive */
export const updateActive = (id, isActive) =>
  db(TABLE).where({ id }).update({ is_active: isActive, updated_at: new Date() });

/**
 * Soft delete — historical merch_order_items must keep resolving their
 * product. The slug is suffixed so the owner can re-create a product with
 * the same name later without hitting the unique constraint.
 * @param {string} id
 */
export const softDelete = (id) =>
  db(TABLE)
    .where({ id })
    .update({
      deleted_at: new Date(),
      is_active: false,
      slug: db.raw("CONCAT(slug, '-deleted-', UNIX_TIMESTAMP())"),
      updated_at: new Date(),
    });

/**
 * Atomically reserves base (no-variant) stock — the WHERE clause re-checks
 * remaining stock at the database level, same pattern as
 * ticket-types-repository.js `reserveInventory`.
 * @param {string} id
 * @param {number} quantity
 * @param {import("knex").Knex} executor - must be an open transaction
 * @returns {Promise<boolean>}
 */
export const reserveStock = async (id, quantity, executor) => {
  const affectedRows = await executor(TABLE)
    .where({ id })
    .andWhere(executor.raw("quantity_sold + ? <= stock", [quantity]))
    .update({ quantity_sold: executor.raw("quantity_sold + ?", [quantity]) });
  return affectedRows > 0;
};

/**
 * Releases previously reserved base stock (order expired/cancelled unpaid).
 * @param {string} id
 * @param {number} quantity
 * @param {import("knex").Knex} [executor]
 */
export const releaseStock = (id, quantity, executor = db) =>
  executor(TABLE)
    .where({ id })
    .update({ quantity_sold: executor.raw("GREATEST(quantity_sold - ?, 0)", [quantity]) });

// Exported for unit testing the typo-tolerance expansion.
export const __testables = { fuzzyPatterns };
