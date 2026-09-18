import { env } from "../config/env.js";
import * as sellerShippingOriginsRepository from "../repositories/seller-shipping-origins-repository.js";
import * as shippingCostCacheRepository from "../repositories/shipping-cost-cache-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { badGateway, badRequest, conflict, notImplemented } from "../utils/http-error.js";
import { groupLinesBySeller, resolveCartLines, totalWeightGrams } from "./merch-cart-service.js";

/**
 * Merch shipping-cost quotes via the api.co.id Cek Ongkir v2 API
 * (`/courier/v2/rates`), served through a DB-side time-window cache
 * (shipping_cost_cache) because the vendor plan is credit-limited. A quote is
 * keyed on (origin district, destination district, integer kg) — repeat
 * renders of the same checkout, the order submit re-pricing the lane, and
 * other buyers on the same lane all hit the cache instead of spending a
 * credit.
 *
 * v2 quotes on 6-digit district (kecamatan) codes, not the 10-digit village
 * codes v1 used — addresses stay village-level (postal codes need it), only
 * the lane key is the district.
 */

/** api.co.id Cek Ongkir v2 endpoint. Auth via the `x-api-co-id` header. */
const COURIER_RATES_URL = "https://use.api.co.id/courier/v2/rates";

/**
 * The couriers api.co.id v2 quotes (mirrors its free `/courier/v1/couriers`
 * list). Powers the seller's enable/disable checkboxes; a vendor courier
 * missing here still works — it just can't be individually toggled until
 * added.
 */
export const KNOWN_COURIERS = [
  { code: "anteraja", name: "Anteraja" },
  { code: "idx", name: "ID Express" },
  { code: "jne", name: "JNE Express" },
  { code: "jnt", name: "JNT Express" },
  { code: "jnt_cargo", name: "JNT Cargo" },
  { code: "lion", name: "Lion Parcel" },
  { code: "ninja", name: "Ninja Express" },
  { code: "paxel", name: "Paxel" },
  { code: "sap", name: "SAP Express" },
  { code: "sicepat", name: "Sicepat Express" },
  { code: "spx", name: "SPX Express" },
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
 * Collapses v2's per-service rate rows into one option per courier — the
 * cheapest service each courier offers — keeping the one-price-per-courier
 * shape the checkout and `merch_orders.courier_code` are built on.
 * `price + handling_fee` is what the buyer is charged, so that is the number
 * ranked and returned.
 * ponytail: cheapest service per courier; expose every service (needs a
 * service_code on the order + a second picker in checkout) if buyers ask to
 * choose between e.g. JNE REG and JNE YES.
 * @param {Array<object>} rates - `data.rates` from `/courier/v2/rates`
 * @returns {Array<{ courier_code: string, courier_name: string, price: number, estimation: string | null }>}
 */
const cheapestPerCourier = (rates) => {
  /** Map of courier_code → the cheapest quoted option for that courier. */
  const bestByCourier = new Map();
  for (const rate of rates) {
    const price = rate.total_price ?? rate.price + (rate.handling_fee ?? 0);
    if (!(price > 0)) continue;
    const current = bestByCourier.get(rate.courier_code);
    if (current && current.price <= price) continue;
    bestByCourier.set(rate.courier_code, {
      courier_code: rate.courier_code,
      courier_name: rate.service_name ? `${rate.courier_name} — ${rate.service_name}` : rate.courier_name,
      price,
      estimation: rate.etd ? `${rate.etd} days` : null,
    });
  }
  return [...bestByCourier.values()].sort((a, b) => a.price - b.price);
};

/**
 * Courier options for one lane, cache-through with a
 * SHIPPING_COST_CACHE_HOURS freshness window.
 * @param {string} originDistrictCode - seller departure district (6 digits)
 * @param {string} destinationDistrictCode - buyer district (6 digits)
 * @param {number} weightKg - integer kg (see {@link gramsToBillableKg})
 * @returns {Promise<Array<{ courier_code: string, courier_name: string, price: number, estimation: string | null }>>}
 */
export const getCourierOptions = async (originDistrictCode, destinationDistrictCode, weightKg) => {
  if (!env.API_CO_ID_KEY) {
    throw notImplemented("SHIPPING_NOT_CONFIGURED", "Shipping quotes are not configured on this server");
  }

  const cached = await shippingCostCacheRepository.find(originDistrictCode, destinationDistrictCode, weightKg);
  const maxAgeMs = env.SHIPPING_COST_CACHE_HOURS * 60 * 60 * 1000;
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < maxAgeMs) {
    return cached.couriers;
  }

  const url = `${COURIER_RATES_URL}?origin_district_code=${originDistrictCode}&destination_district_code=${destinationDistrictCode}&weight=${weightKg}`;
  let json;
  try {
    const response = await fetch(url, { headers: { "x-api-co-id": env.API_CO_ID_KEY } });
    json = await response.json().catch(() => null);
    if (!response.ok || !json?.is_success) {
      // Vendor 400/404s are actionable (unsupported district, bad code) —
      // surface their message instead of a generic failure. A 402 (vendor
      // balance empty) is ours to fix, not the buyer's, so it stays generic.
      const message = json?.message;
      if (message && response.status < 500 && response.status !== 402) {
        throw badRequest("SHIPPING_LANE_UNAVAILABLE", `Shipping quote failed: ${message}`);
      }
      throw new Error(`api.co.id courier rates failed (${response.status})`);
    }
  } catch (error) {
    if (error.statusCode) throw error;
    // Courier prices go stale fast, but a stale quote still beats blocking
    // checkout while the vendor is down — the submit re-prices from the same
    // cache, so buyer-shown and charged prices stay consistent.
    if (cached) {
      console.error(
        `Shipping quote fetch failed, serving stale cache for ${originDistrictCode}->${destinationDistrictCode}:`,
        error.message,
      );
      return cached.couriers;
    }
    throw badGateway("SHIPPING_QUOTE_FAILED", "Could not calculate shipping costs right now");
  }

  const couriers = cheapestPerCourier(json.data?.rates ?? []);
  await shippingCostCacheRepository.save(originDistrictCode, destinationDistrictCode, weightKg, couriers);
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
 * saved delivery district.
 *
 * @param {{ sub: string }} requester - the signed-in buyer
 * @param {Array<{ productId: string, variantId?: string, quantity: number }>} items
 * @returns {Promise<Array<{ sellerId: string, weightGrams: number, weightKg: number, couriers: object[] }>>}
 */
export const quoteCart = async (requester, items) => {
  const buyer = await usersRepository.findById(requester.sub);
  if (!buyer.district_code) {
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
      await getCourierOptions(origin.district_code, buyer.district_code, weightKg),
    );
    quotes.push({ sellerId, weightGrams, weightKg, couriers });
  }
  return quotes;
};

// Exported for unit tests — collapsing v2 per-service rates is the non-trivial bit.
export const __testables = { cheapestPerCourier };
