import * as productVariantsRepository from "../repositories/product-variants-repository.js";
import * as productsRepository from "../repositories/products-repository.js";
import { badRequest } from "../utils/http-error.js";

/**
 * Cart-line resolution shared by shipping quotes and order creation — both
 * must price/weigh the exact same server-side view of the cart, never the
 * client's numbers.
 */

/**
 * Resolves cart items against the live catalog: active product, valid/active
 * variant when the product has variants, authoritative unit price, and the
 * product's package weight.
 * @param {Array<{ productId: string, variantId?: string, quantity: number }>} items
 * @returns {Promise<Array<{ product: object, variant: object | null, quantity: number, unitPrice: number }>>}
 */
export const resolveCartLines = async (items) => {
  const lines = [];
  for (const item of items) {
    const product = await productsRepository.findById(item.productId);
    if (!product || !product.is_active) {
      throw badRequest("PRODUCT_NOT_AVAILABLE", `Product ${item.productId} is not available`);
    }

    let variant = null;
    if (product.has_variants) {
      if (!item.variantId) throw badRequest("VARIANT_REQUIRED", `"${product.name}" requires choosing a variant`);
      variant = await productVariantsRepository.findVariantById(item.variantId);
      if (!variant || variant.product_id !== product.id || !variant.is_active) {
        throw badRequest("VARIANT_NOT_AVAILABLE", `The chosen variant of "${product.name}" is not available`);
      }
    } else if (item.variantId) {
      throw badRequest("VARIANT_NOT_AVAILABLE", `"${product.name}" has no variants`);
    }

    lines.push({
      product,
      variant,
      quantity: item.quantity,
      unitPrice: variant ? variant.price : product.price,
    });
  }
  return lines;
};

/**
 * Groups resolved lines per seller — a multi-seller cart becomes one order
 * (and one shipping quote) per seller.
 * @param {Array<{ product: { owner_id: string } }>} lines - from {@link resolveCartLines}
 * @returns {Map<string, object[]>} seller id → that seller's lines
 */
export const groupLinesBySeller = (lines) => {
  const linesBySeller = new Map();
  for (const line of lines) {
    const sellerId = line.product.owner_id;
    if (!linesBySeller.has(sellerId)) linesBySeller.set(sellerId, []);
    linesBySeller.get(sellerId).push(line);
  }
  return linesBySeller;
};

/**
 * Total package weight of one seller's lines, in grams — the product's
 * weight applies per unit (variants share their product's weight).
 * @param {Array<{ product: { weight_grams: number }, quantity: number }>} sellerLines
 * @returns {number}
 */
export const totalWeightGrams = (sellerLines) =>
  sellerLines.reduce((sum, line) => sum + line.product.weight_grams * line.quantity, 0);
