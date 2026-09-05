"use server";

import { toActionResult, type ActionResult } from "@/lib/api/action-result";
import { apiFetch, apiFetchPage } from "@/lib/api/client";
import { toMerchOrder, toMerchOrderPayment, toMerchPromoValidation, toProduct } from "@/lib/api/normalize";
import type {
  ApiPageMeta,
  CreateMerchOrderRequest,
  ListMerchCatalogQuery,
  MerchOrder,
  MerchPromoValidation,
  Product,
  RawMerchOrder,
  RawMerchOrderPayment,
  RawMerchPromoValidation,
  RawProduct,
  ValidateMerchPromoCodeRequest,
} from "@/lib/api/types";

/**
 * Checkout — a multi-seller cart comes back as MULTIPLE orders (one per
 * seller), each with its own payment window/instructions.
 */
export async function createMerchOrdersAction(input: CreateMerchOrderRequest): Promise<ActionResult<MerchOrder[]>> {
  return toActionResult(
    () => apiFetch<RawMerchOrder[]>("/api/merch-orders", { method: "POST", body: input }),
    (raw) => raw.map(toMerchOrder),
  );
}

/**
 * Buyer-facing checkout preview of a seller's promo code. The authoritative
 * discount is recomputed (and the use consumed) when the order is created.
 */
export async function validateMerchPromoCodeAction(
  input: ValidateMerchPromoCodeRequest,
): Promise<ActionResult<MerchPromoValidation>> {
  return toActionResult(
    () => apiFetch<RawMerchPromoValidation>("/api/merch-promo-codes/validate", { method: "POST", body: input }),
    toMerchPromoValidation,
  );
}

/** `formData` must contain a `proof` file field, plus `method`/`transferNote` as needed. */
export async function submitMerchPaymentProofAction(orderId: string, formData: FormData) {
  return toActionResult(
    () => apiFetch<RawMerchOrderPayment>(`/api/merch-orders/${orderId}/payments`, { method: "POST", formData }),
    toMerchOrderPayment,
  );
}

export async function cancelMerchOrderAction(orderId: string): Promise<ActionResult<MerchOrder>> {
  return toActionResult(() => apiFetch<RawMerchOrder>(`/api/merch-orders/${orderId}/cancel`, { method: "POST" }), toMerchOrder);
}

/**
 * Next page for the storefront's infinite scroll — the initial page renders
 * server-side; the sentinel at the bottom of the grid calls this for
 * page 2, 3, … with the same filters.
 */
export async function loadMoreMerchAction(
  query: ListMerchCatalogQuery,
): Promise<ActionResult<{ products: Product[]; meta: ApiPageMeta }>> {
  return toActionResult(
    () => apiFetchPage<RawProduct>("/api/merch", { query }),
    ({ data, meta }) => ({ products: data.map(toProduct), meta }),
  );
}
