/**
 * Semantic-search vectors for merch products — one row per product, computed
 * from `name + description` through the Voyage AI embeddings API (see
 * services/embedding-service.js). `content_hash` is
 * SHA2(CONCAT(name, 0x0A, description), 256), letting the refresh sweep find
 * stale rows entirely in SQL. The whole feature is optional: with no
 * VOYAGE_API_KEY configured, catalog search simply stays FULLTEXT + fuzzy.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("product_embeddings", (table) => {
    table.uuid("product_id").primary();
    table.string("model", 64).notNullable();
    table.string("content_hash", 64).notNullable();
    // ~1024 floats as a JSON array (~12KB) — MySQL 8 has no vector type, and
    // at merch-catalog scale cosine similarity in Node over all rows is cheap.
    table.json("embedding").notNullable();
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("product_id").references("id").inTable("products").onDelete("CASCADE");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("product_embeddings");
};
