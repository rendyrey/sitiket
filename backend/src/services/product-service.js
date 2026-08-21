import { merchCategoriesRepository } from "../repositories/merch-categories-repository.js";
import * as productImagesRepository from "../repositories/product-images-repository.js";
import * as productVariantsRepository from "../repositories/product-variants-repository.js";
import * as productsRepository from "../repositories/products-repository.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/http-error.js";
import { slugify } from "../utils/slugify.js";

/** Shopee-style gallery cap — mirrored by the dashboard image manager UI. */
const MAX_IMAGES_PER_PRODUCT = 10;
const MAX_OPTION_GROUPS = 3;
const MAX_OPTIONS_PER_GROUP = 20;

/**
 * Generates a unique slug from the product name, appending a short suffix on
 * collision (e.g. "band-tee-2") — same approach as event-service.js.
 * @param {string} name
 */
const generateUniqueSlug = async (name) => {
  const base = slugify(name);
  let candidate = base;
  let attempt = 1;

  while (await productsRepository.findBySlug(candidate)) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }

  return candidate;
};

const assertCategoryIsUsable = async (categoryId) => {
  const category = await merchCategoriesRepository.findById(categoryId);
  if (!category || !category.is_active) {
    throw badRequest("INVALID_CATEGORY", "Merch category does not exist or is inactive");
  }
};

/**
 * Loads a product and asserts the requester may manage it (its owner or a
 * super_admin) — reused by every product-scoped mutation.
 * @param {string} productId
 * @param {{ sub: string, role: string }} requester
 */
export const getOwnedProductOrThrow = async (productId, requester) => {
  const product = await productsRepository.findById(productId);
  if (!product) throw notFound("PRODUCT_NOT_FOUND", "Product not found");
  if (requester.role !== "super_admin" && product.owner_id !== requester.sub) {
    throw forbidden("NOT_PRODUCT_OWNER", "Only the product owner or a super_admin can perform this action");
  }
  return product;
};

/** @param {string} ownerId */
export const listMine = (ownerId) => productsRepository.listByOwner(ownerId);

/**
 * Full owner-facing read model: the product row plus its gallery and
 * option/variant config, in one payload.
 * @param {string} productId
 * @param {{ sub: string, role: string }} requester
 */
export const getMineDetail = async (productId, requester) => {
  const product = await getOwnedProductOrThrow(productId, requester);
  const [images, config] = await Promise.all([
    productImagesRepository.listByProduct(productId),
    productVariantsRepository.getConfig(productId),
  ]);
  return { ...product, images, ...config };
};

/**
 * @param {string} ownerId
 * @param {{ categoryId: string, name: string, description: string, price: number, stock: number }} input
 */
export const createProduct = async (ownerId, input) => {
  await assertCategoryIsUsable(input.categoryId);
  const slug = await generateUniqueSlug(input.name);
  return productsRepository.create({ ...input, ownerId, slug });
};

/**
 * @param {string} productId
 * @param {{ sub: string, role: string }} requester
 * @param {object} patch - camelCase product fields
 */
export const updateProduct = async (productId, requester, patch) => {
  await getOwnedProductOrThrow(productId, requester);
  if (patch.categoryId !== undefined) await assertCategoryIsUsable(patch.categoryId);
  return productsRepository.update(productId, patch);
};

/**
 * Enable/disable — a disabled product disappears from the public catalog but
 * keeps its data and order history.
 * @param {string} productId
 * @param {{ sub: string, role: string }} requester
 * @param {boolean} isActive
 */
export const setProductActive = async (productId, requester, isActive) => {
  await getOwnedProductOrThrow(productId, requester);
  await productsRepository.updateActive(productId, isActive);
  return productsRepository.findById(productId);
};

/**
 * Soft delete — merch_order_items keep resolving the product for history.
 * @param {string} productId
 * @param {{ sub: string, role: string }} requester
 */
export const deleteProduct = async (productId, requester) => {
  await getOwnedProductOrThrow(productId, requester);
  await productsRepository.softDelete(productId);
};

/**
 * @param {string} productId
 * @param {{ sub: string, role: string }} requester
 * @param {{ filename: string }} file - saved by middleware/upload.js
 */
export const addImage = async (productId, requester, file) => {
  if (!file) throw badRequest("IMAGE_REQUIRED", "An image file is required");
  await getOwnedProductOrThrow(productId, requester);

  const count = await productImagesRepository.countByProduct(productId);
  if (count >= MAX_IMAGES_PER_PRODUCT) {
    throw conflict("IMAGE_LIMIT_REACHED", `A product can have at most ${MAX_IMAGES_PER_PRODUCT} photos`);
  }

  return productImagesRepository.create({
    productId,
    imageUrl: `/uploads/${file.filename}`,
    sortOrder: count,
  });
};

/**
 * @param {string} productId
 * @param {string} imageId
 * @param {{ sub: string, role: string }} requester
 */
export const removeImage = async (productId, imageId, requester) => {
  await getOwnedProductOrThrow(productId, requester);
  const image = await productImagesRepository.findById(imageId);
  if (!image || image.product_id !== productId) throw notFound("IMAGE_NOT_FOUND", "Product image not found");
  await productImagesRepository.remove(imageId);
};

/**
 * Validates and atomically replaces a product's whole option/variant config.
 * `variants[].options[i]` must be a value from `groups[i]`; every variant
 * covers every group exactly once and combinations must be unique — the
 * Shopee/Tokopedia matrix model where each combination has its own
 * price/stock. An empty config (`groups: [], variants: []`) removes variants
 * entirely, falling back to the product's base price/stock.
 *
 * @param {string} productId
 * @param {{ sub: string, role: string }} requester
 * @param {{ groups: Array<{ name: string, options: string[] }>, variants: Array<{ options: string[], price: number, stock: number, isActive?: boolean }> }} config
 */
export const replaceVariantConfig = async (productId, requester, config) => {
  await getOwnedProductOrThrow(productId, requester);
  validateVariantConfig(config);
  return productVariantsRepository.replaceConfig(productId, config);
};

/**
 * Pure cross-field validation for a variant config — throws an HttpError on
 * the first violated rule. Extracted from {@link replaceVariantConfig} so it
 * is unit-testable without a database.
 * @param {{ groups: Array<{ name: string, options: string[] }>, variants: Array<{ options: string[], price: number, stock: number, isActive?: boolean }> }} config
 */
const validateVariantConfig = (config) => {
  if (config.groups.length > MAX_OPTION_GROUPS) {
    throw badRequest("TOO_MANY_OPTION_GROUPS", `A product can have at most ${MAX_OPTION_GROUPS} option groups`);
  }
  if (config.groups.length === 0 && config.variants.length > 0) {
    throw badRequest("VARIANTS_WITHOUT_GROUPS", "Variants require at least one option group");
  }
  if (config.groups.length > 0 && config.variants.length === 0) {
    throw badRequest("GROUPS_WITHOUT_VARIANTS", "Add at least one variant combination, or remove the option groups");
  }

  const groupNames = new Set();
  for (const group of config.groups) {
    if (groupNames.has(group.name)) throw badRequest("DUPLICATE_GROUP_NAME", `Option group "${group.name}" is duplicated`);
    groupNames.add(group.name);
    if (group.options.length === 0) throw badRequest("EMPTY_OPTION_GROUP", `Option group "${group.name}" has no options`);
    if (group.options.length > MAX_OPTIONS_PER_GROUP) {
      throw badRequest("TOO_MANY_OPTIONS", `Option group "${group.name}" exceeds ${MAX_OPTIONS_PER_GROUP} options`);
    }
    if (new Set(group.options).size !== group.options.length) {
      throw badRequest("DUPLICATE_OPTION_VALUE", `Option group "${group.name}" has duplicate values`);
    }
  }

  const seenCombinations = new Set();
  for (const variant of config.variants) {
    if (variant.options.length !== config.groups.length) {
      throw badRequest("VARIANT_GROUP_MISMATCH", "Each variant must pick exactly one option from every group");
    }
    variant.options.forEach((value, groupIndex) => {
      if (!config.groups[groupIndex].options.includes(value)) {
        throw badRequest(
          "UNKNOWN_OPTION_VALUE",
          `"${value}" is not an option of group "${config.groups[groupIndex].name}"`,
        );
      }
    });
    const key = variant.options.join(" ");
    if (seenCombinations.has(key)) {
      throw badRequest("DUPLICATE_VARIANT", `Variant "${variant.options.join(" / ")}" is duplicated`);
    }
    seenCombinations.add(key);
  }
};

// Exported for unit testing the pure validation rules.
export const __testables = { validateVariantConfig };
