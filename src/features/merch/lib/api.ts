import { apiFetch, apiFetchPage } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  toMerchCategory,
  toMerchOrder,
  toProduct,
  toProductDetail,
} from "@/lib/api/normalize";
import type {
  ApiPageMeta,
  ListMerchCatalogQuery,
  MerchCategory,
  MerchOrder,
  PaymentInstructions,
  Product,
  ProductDetail,
  RawMerchCategory,
  RawMerchOrder,
  RawProduct,
  RawProductDetail,
} from "@/lib/api/types";

// ---- Public storefront ----

/** Server-only. The public merch catalog page — search, filters, pagination. */
export const listMerchCatalog = async (
  query?: ListMerchCatalogQuery,
): Promise<{ products: Product[]; meta: ApiPageMeta }> => {
  const { data, meta } = await apiFetchPage<RawProduct>("/api/merch", { query });
  return { products: data.map(toProduct), meta };
};

/** Server-only. Public product detail — gallery, option groups, variants, seller name. `null` when unknown/disabled. */
export const getMerchProduct = async (slug: string): Promise<ProductDetail | null> => {
  try {
    const raw = await apiFetch<RawProductDetail>(`/api/merch/${slug}`);
    return toProductDetail(raw);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
};

/** Server-only. Active merch categories for the public filter chips. */
export const listMerchCategories = async (): Promise<MerchCategory[]> => {
  const raw = await apiFetch<RawMerchCategory[]>("/api/merch-categories");
  return raw.map(toMerchCategory);
};

// ---- Buyer orders ----

/** Server-only. One merch order, if the signed-in viewer is its buyer/seller/super_admin; `null` otherwise. */
export const getMerchOrderForViewer = async (orderId: string): Promise<MerchOrder | null> => {
  try {
    const raw = await apiFetch<RawMerchOrder>(`/api/merch-orders/${orderId}`);
    return toMerchOrder(raw);
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
};

/** Server-only. `null` if the seller has no payout method configured. */
export const getMerchPaymentInstructions = async (orderId: string): Promise<PaymentInstructions | null> => {
  try {
    return await apiFetch<PaymentInstructions>(`/api/merch-orders/${orderId}/payments/instructions`);
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
};

/** Server-only. The signed-in buyer's merch purchase history (items included). */
export const listMyMerchOrders = async (): Promise<MerchOrder[]> => {
  const raw = await apiFetch<RawMerchOrder[]>("/api/merch-orders/mine");
  return raw.map(toMerchOrder);
};
