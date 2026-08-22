import { env } from "../config/env.js";
import * as sellerShippingOriginsRepository from "../repositories/seller-shipping-origins-repository.js";
import * as shippingCostCacheRepository from "../repositories/shipping-cost-cache-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { badGateway, badRequest, conflict, notImplemented } from "../utils/http-error.js";
import { groupLinesBySeller, resolveCartLines, totalWeightGrams } from "./merch-cart-service.js";

/**
 * Merch shipping-cost quotes via the api.co.id Expedition API, served through
 * a DB-side time-window cache (shipping_cost_cache) because the vendor plan
 * is credit-limited. A quote is keyed on (origin village, destination
 * village, integer kg) — repeat renders of the same checkout, the order
 * submit re-pricing the lane, and other buyers on the same lane all hit the
 * cache instead of spending a credit.
 */

/** api.co.id expedition endpoint. Auth via the `x-api-co-id` header. */
const SHIPPING_COST_URL = "https://use.api.co.id/expedition/shipping-cost";

/**
 * The expedition couriers api.co.id quotes (it has no "list couriers"
 * endpoint, so this catalog mirrors its quote responses). Powers the seller's
 * enable/disable checkboxes; a vendor courier missing here still works — it
 * just can't be individually toggled until added.
 */
export const KNOWN_COURIERS = [
  { code: "JNE", name: "JNE Express" },
  { code: "JNECargo", name: "JNE Cargo" },
  { code: "SiCepat", name: "SiCepat Express" },
  { code: "SiCepatCargo", name: "SiCepat Cargo" },
  { code: "SAP", name: "SAP Express" },
  { code: "SAPLite", name: "SAP Lite" },
  { code: "SapCargo", name: "SAP Cargo" },
  { code: "iDexpress", name: "iDexpress" },
  { code: "iDlite", name: "iDlite" },
  { code: "iDexpressCargo", name: "iDexpress Cargo" },
  { code: "JT", name: "J&T Express" },
  { code: "lion", name: "Lion Parcel" },
  { code: "anteraja", name: "AnterAja" },
  { code: "Ninja", name: "Ninja Express" },
];

/**
 * Applies the seller's courier whitelist to a quoted courier list.
 * `enabled_couriers` null/empty = the seller offers every courier.
 * @param {{ enabled_couriers?: string[] | null }} origin - a `seller_shipping_origins` row
 * @param {Array<{ courier_code: string }>} couriers - quoted options for the lane
 */
export const filterCouriersForOrigin = (origin, couriers) => {
  const enabled = origin.enabled_couriers;
  if (!enabled?.length) return couriers;
  return couriers.filter((courier) => enabled.includes(courier.courier_code));
};

/**
 * Billable weight: couriers price per started kg with a 1kg minimum.
 * @param {number} grams - total package weight in grams. Example: `2300` → `3`
 * @returns {number} integer kg, at least 1
 */
export const gramsToBillableKg = (grams) => Math.max(1, Math.ceil(grams / 1000));

/**
 * Courier options for one lane, cache-through with a
 * SHIPPING_COST_CACHE_HOURS freshness window.
 * @param {string} originVillageCode - seller departure village (10 digits)
 * @param {string} destinationVillageCode - buyer village (10 digits)
 * @param {number} weightKg - integer kg (see {@link gramsToBillableKg})
 * @returns {Promise<Array<{ courier_code: string, courier_name: string, price: number, weight: number, estimation: string }>>}
 */
export const getCourierOptions = async (originVillageCode, destinationVillageCode, weightKg) => {
  if (!env.API_CO_ID_KEY) {
    throw notImplemented("SHIPPING_NOT_CONFIGURED", "Shipping quotes are not configured on this server");
  }

  const cached = await shippingCostCacheRepository.find(originVillageCode, destinationVillageCode, weightKg);
  const maxAgeMs = env.SHIPPING_COST_CACHE_HOURS * 60 * 60 * 1000;
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < maxAgeMs) {
    return cached.couriers;
  }

  const url = `${SHIPPING_COST_URL}?origin_village_code=${originVillageCode}&destination_village_code=${destinationVillageCode}&weight=${weightKg}`;
  let json;
  try {
    const response = await fetch(url, { headers: { "x-api-co-id": env.API_CO_ID_KEY } });
    json = await response.json().catch(() => null);
    if (!response.ok || !json?.is_success) {
      // Vendor 400/404s are actionable (unsupported village, bad code) —
      // surface their message instead of a generic failure.
      const message = json?.message;
      if (message && response.status < 500) {
        throw badRequest("SHIPPING_LANE_UNAVAILABLE", `Shipping quote failed: ${message}`);
      }
      throw new Error(`api.co.id shipping-cost failed (${response.status})`);
    }
  } catch (error) {
    if (error.statusCode) throw error;
    // Courier prices go stale fast, but a stale quote still beats blocking
    // checkout while the vendor is down — the submit re-prices from the same
    // cache, so buyer-shown and charged prices stay consistent.
    if (cached) {
      console.error(
        `Shipping quote fetch failed, serving stale cache for ${originVillageCode}->${destinationVillageCode}:`,
        error.message,
      );
      return cached.couriers;
    }
    throw badGateway("SHIPPING_QUOTE_FAILED", "Could not calculate shipping costs right now");
  }

  const couriers = (json.data?.couriers ?? []).filter((courier) => courier.price > 0);
  await shippingCostCacheRepository.save(originVillageCode, destinationVillageCode, weightKg, couriers);
  return couriers;
};

/**
 * Loads a seller's departure address or fails with the checkout-facing error.
 * @param {string} sellerId
 * @param {string} [sellerName] - for the buyer-facing message
 */
export const getOriginOrThrow = async (sellerId, sellerName) => {
  const origin = await sellerShippingOriginsRepository.findByOwner(sellerId);
  if (!origin) {
    throw conflict(
      "SELLER_NO_SHIPPING_ORIGIN",
      `${sellerName ?? "This seller"} has not set a shipping departure address yet`,
    );
  }
  return origin;
};

/**
 * Full checkout shipping quote: resolves the cart server-side, groups it per
 * seller, and returns each seller group's courier options for the buyer's
 * saved delivery village.
 *
 * @param {{ sub: string }} requester - the signed-in buyer
 * @param {Array<{ productId: string, variantId?: string, quantity: number }>} items
 * @returns {Promise<Array<{ sellerId: string, weightGrams: number, weightKg: number, couriers: object[] }>>}
 */
export const quoteCart = async (requester, items) => {
  const buyer = await usersRepository.findById(requester.sub);
  if (!buyer.village_code) {
    throw conflict(
      "PROFILE_INCOMPLETE",
      "Add your delivery address (down to the village) to your account before requesting shipping costs",
    );
  }

  const lines = await resolveCartLines(items);
  const linesBySeller = groupLinesBySeller(lines);

  const quotes = [];
  for (const [sellerId, sellerLines] of linesBySeller) {
    const seller = await usersRepository.findById(sellerId);
    const origin = await getOriginOrThrow(sellerId, seller?.name);
    const weightGrams = totalWeightGrams(sellerLines);
    const weightKg = gramsToBillableKg(weightGrams);
    // The lane cache is shared across sellers; the seller's courier whitelist
    // is applied on top of it, never baked into the cached list.
    const couriers = filterCouriersForOrigin(
      origin,
      await getCourierOptions(origin.village_code, buyer.village_code, weightKg),
    );
    quotes.push({ sellerId, weightGrams, weightKg, couriers });
  }
  return quotes;
};
