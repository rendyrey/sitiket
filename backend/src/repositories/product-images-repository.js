import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "product_images";

/** @param {string} productId */
export const listByProduct = (productId) =>
  db(TABLE).where({ product_id: productId }).orderBy([{ column: "sort_order" }, { column: "created_at" }]);

/** @param {string} id */
export const findById = (id) => db(TABLE).where({ id }).first();

/** @param {string} productId @returns {Promise<number>} */
export const countByProduct = async (productId) => {
  const [{ total }] = await db(TABLE).where({ product_id: productId }).count({ total: "id" });
  return Number(total);
};

/** @param {{ productId: string, imageUrl: string, sortOrder: number }} input */
export const create = async ({ productId, imageUrl, sortOrder }) => {
  const id = newId();
  await db(TABLE).insert({
    id,
    product_id: productId,
    image_url: imageUrl,
    sort_order: sortOrder,
    created_at: new Date(),
  });
  return findById(id);
};

/** @param {string} id */
export const remove = (id) => db(TABLE).where({ id }).delete();
