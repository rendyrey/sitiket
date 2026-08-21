import { db } from "../config/db.js";

const TABLE = "product_embeddings";

/**
 * The SQL twin of embedding-service.js `contentHash` — both must hash
 * `name + "\n" + description` with SHA-256, or the refresh sweep loops
 * forever re-embedding "stale" rows.
 */
const CONTENT_HASH_SQL = "SHA2(CONCAT(products.name, 0x0A, products.description), 256)";

/**
 * @param {string} productId
 * @param {{ model: string, contentHash: string, embedding: number[] }} input
 */
export const upsert = (productId, { model, contentHash, embedding }) =>
  db(TABLE)
    .insert({
      product_id: productId,
      model,
      content_hash: contentHash,
      embedding: JSON.stringify(embedding),
      updated_at: new Date(),
    })
    .onConflict("product_id")
    .merge();

/**
 * Embeddings for every product the public catalog can currently show —
 * the candidate set for a semantic query. Parsed to float arrays here so
 * callers never see the JSON-string storage detail.
 * @returns {Promise<Array<{ product_id: string, embedding: number[] }>>}
 */
export const listForCatalog = async () => {
  const rows = await db(TABLE)
    .join("products", "products.id", `${TABLE}.product_id`)
    .where("products.is_active", true)
    .whereNull("products.deleted_at")
    .select(`${TABLE}.product_id`, `${TABLE}.embedding`);
  return rows.map((row) => ({
    product_id: row.product_id,
    embedding: typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding,
  }));
};

/**
 * Products whose embedding is missing or no longer matches their current
 * name/description — the refresh sweep's work queue. Soft-deleted products
 * are skipped (nothing searches them).
 * @param {number} limit
 */
export const listProductsNeedingEmbedding = (limit) =>
  db("products")
    .leftJoin(TABLE, `${TABLE}.product_id`, "products.id")
    .whereNull("products.deleted_at")
    .andWhere((builder) => {
      builder.whereNull(`${TABLE}.product_id`).orWhereRaw(`${TABLE}.content_hash != ${CONTENT_HASH_SQL}`);
    })
    .select("products.id", "products.name", "products.description")
    .limit(limit);
