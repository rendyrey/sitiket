import * as productImagesRepository from "../repositories/product-images-repository.js";
import * as productVariantsRepository from "../repositories/product-variants-repository.js";
import * as productsRepository from "../repositories/products-repository.js";
import { semanticProductIds } from "./embedding-service.js";
import { notFound } from "../utils/http-error.js";

/**
 * Public catalog page — active, non-deleted products only, with search,
 * category and price-range filters, paginated for the storefront's infinite
 * scroll.
 *
 * Search is hybrid: keyword (FULLTEXT relevance + typo-tolerant fuzzy — see
 * repositories/products-repository.js) UNION embedding-based semantic
 * candidates (embedding-service.js; meaning-level matches like "shirt" →
 * "tee"). Semantic search is optional — `semanticProductIds` returns null
 * without a VOYAGE_API_KEY or on any vendor error, and search silently
 * stays keyword-only.
 * @param {object} filters - see `searchCatalog`
 */
export const listCatalog = async (filters) => {
  const semanticIds = filters?.search ? await semanticProductIds(filters.search) : null;
  return productsRepository.searchCatalog({ ...filters, semanticIds: semanticIds ?? undefined });
};

/**
 * Public product detail — the full Shopee-style read model: gallery images,
 * option groups, variants (per-combination price/stock), and the seller's
 * public name so the buyer knows who fulfils the order.
 * @param {string} slug
 */
export const getBySlug = async (slug) => {
  const product = await productsRepository.findBySlug(slug);
  if (!product || !product.is_active) throw notFound("PRODUCT_NOT_FOUND", "Product not found");

  const [images, config] = await Promise.all([
    productImagesRepository.listByProduct(product.id),
    productVariantsRepository.getConfig(product.id),
  ]);

  return {
    ...product,
    images,
    ...config,
    // seller_name comes from the catalog join; fall back for deleted accounts.
    seller_name: product.seller_name ?? "SiTIKET seller",
  };
};
