import * as merchCatalogService from "../services/merch-catalog-service.js";
import * as productService from "../services/product-service.js";
import { badRequest } from "../utils/http-error.js";

/** GET /api/merch — public storefront listing (search/filter/pagination). */
export const listCatalog = async (request, response) => {
  const { rows, total, page, pageSize } = await merchCatalogService.listCatalog({
    search: request.query.search,
    categorySlug: request.query.category,
    minPrice: request.query.minPrice,
    maxPrice: request.query.maxPrice,
    sortBy: request.query.sortBy,
    page: request.query.page,
    pageSize: request.query.pageSize,
  });
  response.status(200).json({ data: rows, meta: { total, page, pageSize } });
};

/** GET /api/merch/:slug — public product detail (gallery + options + variants). */
export const getBySlug = async (request, response) => {
  const product = await merchCatalogService.getBySlug(request.params.slug);
  response.status(200).json({ data: product });
};

/** GET /api/products/mine — the seller's own products with sales stats. */
export const listMine = async (request, response) => {
  const products = await productService.listMine(request.user.sub);
  response.status(200).json({ data: products });
};

/** GET /api/products/:id — owner detail (product + images + variant config). */
export const getMine = async (request, response) => {
  const product = await productService.getMineDetail(request.params.id, request.user);
  response.status(200).json({ data: product });
};

/** POST /api/products */
export const create = async (request, response) => {
  const product = await productService.createProduct(request.user.sub, request.body);
  response.status(201).json({ data: product });
};

/** PATCH /api/products/:id */
export const update = async (request, response) => {
  const product = await productService.updateProduct(request.params.id, request.user, request.body);
  response.status(200).json({ data: product });
};

/** PATCH /api/products/:id/status — enable/disable in the public catalog. */
export const setActive = async (request, response) => {
  const product = await productService.setProductActive(request.params.id, request.user, request.body.isActive);
  response.status(200).json({ data: product });
};

/** DELETE /api/products/:id — soft delete. */
export const remove = async (request, response) => {
  await productService.deleteProduct(request.params.id, request.user);
  response.status(204).end();
};

/** PUT /api/products/:id/variants — replace the whole option/variant config. */
export const replaceVariants = async (request, response) => {
  const config = await productService.replaceVariantConfig(request.params.id, request.user, request.body);
  response.status(200).json({ data: config });
};

/** POST /api/products/:id/images — multipart upload, field name "image". */
export const addImage = async (request, response) => {
  if (!request.file) throw badRequest("IMAGE_REQUIRED", 'A file is required in the "image" field');
  const image = await productService.addImage(request.params.id, request.user, request.file);
  response.status(201).json({ data: image });
};

/** DELETE /api/products/:id/images/:imageId */
export const removeImage = async (request, response) => {
  await productService.removeImage(request.params.id, request.params.imageId, request.user);
  response.status(204).end();
};
