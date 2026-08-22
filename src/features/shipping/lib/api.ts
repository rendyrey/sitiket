import { apiFetch } from "@/lib/api/client";
import { toSellerShippingOrigin } from "@/lib/api/normalize";
import type { RawSellerShippingOrigin, SellerShippingOrigin, ShippingCourier } from "@/lib/api/types";

/**
 * Server-only. The signed-in admin's shipping departure address, or `null` if
 * not set up yet — the "must complete before selling merch" prerequisite.
 */
export const getMyShippingOrigin = async (): Promise<SellerShippingOrigin | null> => {
  const raw = await apiFetch<RawSellerShippingOrigin | null>("/api/shipping-origin");
  return raw ? toSellerShippingOrigin(raw) : null;
};

/** Server-only. The known courier catalog — powers the seller's enable/disable checkboxes. */
export const listShippingCouriers = (): Promise<ShippingCourier[]> => apiFetch<ShippingCourier[]>("/api/shipping/couriers");
