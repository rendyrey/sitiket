"use server";

import { toActionResult, type ActionResult } from "@/lib/api/action-result";
import { apiFetch } from "@/lib/api/client";
import { toSellerShippingOrigin, toShippingQuote } from "@/lib/api/normalize";
import type {
  CreateMerchOrderItemRequest,
  RawSellerShippingOrigin,
  RawShippingQuote,
  RegionDistrict,
  RegionProvince,
  RegionRegency,
  RegionVillage,
  SaveShippingOriginRequest,
  SellerShippingOrigin,
  ShippingCourier,
  ShippingQuote,
} from "@/lib/api/types";

// ---- Indonesian region lists (DB-cached server-side; each is one small array) ----

export async function listProvincesAction(): Promise<ActionResult<RegionProvince[]>> {
  return toActionResult(() => apiFetch<RegionProvince[]>("/api/regions/provinces"));
}

export async function listRegenciesAction(provinceCode: string): Promise<ActionResult<RegionRegency[]>> {
  return toActionResult(() => apiFetch<RegionRegency[]>(`/api/regions/provinces/${provinceCode}/regencies`));
}

export async function listDistrictsAction(regencyCode: string): Promise<ActionResult<RegionDistrict[]>> {
  return toActionResult(() => apiFetch<RegionDistrict[]>(`/api/regions/regencies/${regencyCode}/districts`));
}

export async function listVillagesAction(districtCode: string): Promise<ActionResult<RegionVillage[]>> {
  return toActionResult(() => apiFetch<RegionVillage[]>(`/api/regions/districts/${districtCode}/villages`));
}

// ---- Checkout shipping quotes ----

/**
 * Courier options per seller for the buyer's cart — priced server-side from
 * each seller's departure address, the buyer's saved village, and the cart's
 * total weight per seller.
 */
export async function getShippingQuotesAction(
  items: CreateMerchOrderItemRequest[],
): Promise<ActionResult<ShippingQuote[]>> {
  return toActionResult(
    () => apiFetch<RawShippingQuote[]>("/api/shipping/quotes", { method: "POST", body: { items } }),
    (raw) => raw.map(toShippingQuote),
  );
}

// ---- Seller shipping departure address & courier whitelist ----

/** The known courier catalog — powers the seller's enable/disable checkboxes. */
export async function listCouriersAction(): Promise<ActionResult<ShippingCourier[]>> {
  return toActionResult(() => apiFetch<ShippingCourier[]>("/api/shipping/couriers"));
}

export async function saveShippingOriginAction(
  input: SaveShippingOriginRequest,
): Promise<ActionResult<SellerShippingOrigin>> {
  return toActionResult(
    () => apiFetch<RawSellerShippingOrigin>("/api/shipping-origin", { method: "PUT", body: input }),
    toSellerShippingOrigin,
  );
}
