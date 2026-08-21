import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import * as productEmbeddingsRepository from "../repositories/product-embeddings-repository.js";

/**
 * Embedding-based semantic search for the merch catalog, via the Voyage AI
 * embeddings API (Anthropic's recommended embedding provider) over plain
 * `fetch` — no SDK dependency.
 *
 * Design constraints:
 * - **Optional by construction.** Everything here is a no-op / null when
 *   VOYAGE_API_KEY is unset, and every caller treats `null` as "keyword
 *   search only". A missing key, a network error, or a Voyage outage can
 *   degrade search quality but can never break search.
 * - **Vectors live in MySQL as JSON** (see product_embeddings) and similarity
 *   is computed in Node — at merch-catalog scale (hundreds to thousands of
 *   products, ~12KB/vector) a full scan is single-digit milliseconds and
 *   needs no vector database.
 * - **Refresh is pull-based.** A sweep (server.js) re-embeds products whose
 *   `content_hash` no longer matches `SHA-256(name + "\n" + description)`,
 *   so product creates/edits need no inline API call on the request path.
 */

const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings";
/** Voyage default: multilingual (Indonesian included), cheap, 1024-dim. */
const VOYAGE_DEFAULT_MODEL = "voyage-3.5-lite";

/**
 * Which embeddings backend to talk to, derived from env:
 * 1. A generic OpenAI-compatible endpoint when the EMBEDDINGS_* trio is set —
 *    `POST {base}/embeddings` with `{input, model}` (no `input_type`; that
 *    param is Voyage-specific and rejected by strict OpenAI-compat servers).
 * 2. Voyage AI when only VOYAGE_API_KEY is set (adds `input_type`, which
 *    measurably improves its retrieval quality).
 * 3. `null` — semantic search off, keyword search only.
 */
const resolveEmbeddingsConfig = () => {
  if (env.EMBEDDINGS_BASE_URL && env.EMBEDDINGS_API_KEY && env.EMBEDDINGS_MODEL) {
    return {
      endpoint: `${env.EMBEDDINGS_BASE_URL.replace(/\/+$/, "")}/embeddings`,
      apiKey: env.EMBEDDINGS_API_KEY,
      model: env.EMBEDDINGS_MODEL,
      sendInputType: false,
    };
  }
  if (env.VOYAGE_API_KEY) {
    return { endpoint: VOYAGE_ENDPOINT, apiKey: env.VOYAGE_API_KEY, model: VOYAGE_DEFAULT_MODEL, sendInputType: true };
  }
  return null;
};

/** Ignore semantic candidates below this cosine similarity. */
const MIN_SIMILARITY = 0.45;
/** At most this many semantic candidates join the keyword results. */
const MAX_SEMANTIC_RESULTS = 20;
/** Query-embedding LRU size — buyers repeat/refine the same searches. */
const QUERY_CACHE_MAX = 500;

export const isSemanticSearchEnabled = () => resolveEmbeddingsConfig() !== null;

/** Must stay in sync with CONTENT_HASH_SQL in product-embeddings-repository.js. */
export const contentHash = (name, description) =>
  createHash("sha256").update(`${name}\n${description}`, "utf8").digest("hex");

/**
 * Calls the configured embeddings endpoint for a batch of texts.
 * @param {string[]} texts
 * @param {"query" | "document"} inputType - queries and documents are embedded
 *   asymmetrically on providers that support it (Voyage); OpenAI-compatible
 *   endpoints embed both the same way and never see this param.
 * @returns {Promise<number[][]>} one vector per input, in order
 */
const embedTexts = async (texts, inputType) => {
  const config = resolveEmbeddingsConfig();
  if (!config) throw new Error("No embeddings provider configured");

  const body = { input: texts, model: config.model };
  if (config.sendInputType) body.input_type = inputType;

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Embeddings request to ${config.endpoint} failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const json = await response.json();
  // Both Voyage and OpenAI-compatible responses carry an `index` per entry —
  // order defensively by it.
  return json.data.sort((a, b) => a.index - b.index).map((entry) => entry.embedding);
};

/** @param {number[]} a @param {number[]} b @returns {number} cosine similarity in [-1, 1]; 0 for degenerate input */
export const cosineSimilarity = (a, b) => {
  if (!a?.length || a.length !== b?.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Tiny insertion-ordered LRU: Map iteration order is insertion order, so
// deleting + re-setting on read keeps the hottest queries at the tail.
const queryEmbeddingCache = new Map();

const embedQueryCached = async (query) => {
  const key = query.trim().toLowerCase();
  if (queryEmbeddingCache.has(key)) {
    const cached = queryEmbeddingCache.get(key);
    queryEmbeddingCache.delete(key);
    queryEmbeddingCache.set(key, cached);
    return cached;
  }
  const [embedding] = await embedTexts([key], "query");
  queryEmbeddingCache.set(key, embedding);
  if (queryEmbeddingCache.size > QUERY_CACHE_MAX) {
    queryEmbeddingCache.delete(queryEmbeddingCache.keys().next().value);
  }
  return embedding;
};

/**
 * Product ids semantically close to the query, best first — or `null` when
 * semantic search is off or fails (callers fall back to keyword-only search;
 * a search request must never 500 because an embeddings vendor hiccuped).
 * @param {string} query
 * @returns {Promise<string[] | null>}
 */
export const semanticProductIds = async (query) => {
  const config = resolveEmbeddingsConfig();
  if (!config || !query?.trim()) return null;
  try {
    const [queryEmbedding, candidates] = await Promise.all([
      embedQueryCached(query),
      // Scoped to the current model — after a provider/model switch, rows
      // embedded by the old model are invisible until the sweep re-embeds
      // them (vectors from different models are not comparable).
      productEmbeddingsRepository.listForCatalog(config.model),
    ]);
    return candidates
      .map((candidate) => ({
        id: candidate.product_id,
        similarity: cosineSimilarity(queryEmbedding, candidate.embedding),
      }))
      .filter((candidate) => candidate.similarity >= MIN_SIMILARITY)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, MAX_SEMANTIC_RESULTS)
      .map((candidate) => candidate.id);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[semantic-search] falling back to keyword search:", error.message);
    return null;
  }
};

/**
 * Embeds up to `limit` products whose stored vector is missing or stale.
 * Runs on an interval (server.js) — new products, edits, and past API
 * failures all converge through this one path. No-op without an API key.
 * @param {number} [limit]
 * @returns {Promise<number>} how many products were (re-)embedded
 */
export const refreshStaleProductEmbeddings = async (limit = 10) => {
  const config = resolveEmbeddingsConfig();
  if (!config) return 0;
  // Rows are stale when content changed OR they were embedded by a different
  // model (e.g. after switching providers) — both re-embed through here.
  const products = await productEmbeddingsRepository.listProductsNeedingEmbedding(limit, config.model);
  if (products.length === 0) return 0;

  const embeddings = await embedTexts(
    products.map((product) => `${product.name}\n${product.description}`),
    "document",
  );
  for (const [index, product] of products.entries()) {
    await productEmbeddingsRepository.upsert(product.id, {
      model: config.model,
      contentHash: contentHash(product.name, product.description),
      embedding: embeddings[index],
    });
  }
  return products.length;
};

// Exported for unit tests.
export const __testables = { cosineSimilarity, contentHash, MIN_SIMILARITY };
