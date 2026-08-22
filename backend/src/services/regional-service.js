import { env } from "../config/env.js";
import * as regionCacheRepository from "../repositories/region-cache-repository.js";
import { badGateway, badRequest, notImplemented } from "../utils/http-error.js";

/**
 * Indonesian region data (province → regency/city → district → village) from
 * the api.co.id "Indonesia Regional API v2", served through a DB-side
 * time-window cache (region_cache) because the vendor plan is credit-limited.
 *
 * Design:
 * - every list is fetched at most once per REGION_CACHE_DAYS window, whole
 *   (all pages), then served from the cache;
 * - a vendor failure degrades to the stale cached copy when one exists —
 *   region data is near-static, stale beats a 502;
 * - village codes are the load-bearing output: the 10-digit code is what the
 *   expedition shipping API keys origins/destinations on.
 */

/** api.co.id regional API root. Auth via the `x-api-co-id` header. */
const BASE_URL = "https://use.api.co.id/regional/indonesia";

/** Fixed vendor page size — pagination cannot be configured. */
const PAGE_SIZE = 100;

/** Hard stop for the page loop, well above the largest real list (~80 villages/district). */
const MAX_PAGES = 30;

/** Whether the api.co.id integration is configured at all. */
export const isShippingConfigured = () => Boolean(env.API_CO_ID_KEY);

/** @returns {string} the configured api.co.id key, or throws a clear 501 */
const requireApiKey = () => {
  if (!env.API_CO_ID_KEY) {
    throw notImplemented("SHIPPING_NOT_CONFIGURED", "Address and shipping lookups are not configured on this server");
  }
  return env.API_CO_ID_KEY;
};

/**
 * Fetches ONE page of an api.co.id regional list.
 * @param {string} path - e.g. `"/provinces"`, `"/districts/317205/villages"`
 * @param {number} page
 * @returns {Promise<{ data: object[], paging?: { total_page: number } }>}
 */
const fetchPage = async (path, page) => {
  const url = `${BASE_URL}${path}?page=${page}`;
  const response = await fetch(url, { headers: { "x-api-co-id": requireApiKey() } });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`api.co.id ${path} failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const json = await response.json();
  if (!json.is_success || !Array.isArray(json.data)) {
    throw new Error(`api.co.id ${path} returned an unexpected payload`);
  }
  return json;
};

/**
 * Fetches a whole api.co.id list across its fixed-size pages.
 * @param {string} path
 * @returns {Promise<object[]>}
 */
const fetchAllPages = async (path) => {
  const first = await fetchPage(path, 1);
  const rows = [...first.data];
  const totalPages = Math.min(first.paging?.total_page ?? 1, MAX_PAGES);
  for (let page = 2; page <= totalPages && first.data.length === PAGE_SIZE; page += 1) {
    const next = await fetchPage(path, page);
    rows.push(...next.data);
    if (next.data.length < PAGE_SIZE) break;
  }
  return rows;
};

/**
 * Cache-through read of one region list: fresh cache wins, then the vendor,
 * then (on vendor failure) a stale cached copy.
 * @param {string} cacheKey - e.g. `"regencies:31"`
 * @param {string} path - the api.co.id path the key maps to
 * @returns {Promise<object[]>}
 */
const getListCached = async (cacheKey, path) => {
  requireApiKey();
  const cached = await regionCacheRepository.find(cacheKey);
  const maxAgeMs = env.REGION_CACHE_DAYS * 24 * 60 * 60 * 1000;
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < maxAgeMs) {
    return cached.payload;
  }

  try {
    const rows = await fetchAllPages(path);
    await regionCacheRepository.save(cacheKey, rows);
    return rows;
  } catch (error) {
    // Region data is near-static: an expired cache entry is still better than
    // failing the address picker while the vendor is down or out of credits.
    if (cached) {
      console.error(`Region fetch failed, serving stale cache for ${cacheKey}:`, error.message);
      return cached.payload;
    }
    throw badGateway("REGION_LOOKUP_FAILED", "Could not load Indonesian region data right now");
  }
};

/** All 34 provinces. @returns {Promise<Array<{ code: string, name: string }>>} */
export const listProvinces = () => getListCached("provinces", "/provinces");

/**
 * Regencies/cities of one province.
 * @param {string} provinceCode - 2-digit province code
 */
export const listRegencies = (provinceCode) =>
  getListCached(`regencies:${provinceCode}`, `/provinces/${provinceCode}/regencies`);

/**
 * Districts (kecamatan) of one regency/city.
 * @param {string} regencyCode - 4-digit regency code
 */
export const listDistricts = (regencyCode) =>
  getListCached(`districts:${regencyCode}`, `/regencies/${regencyCode}/districts`);

/**
 * Villages (kelurahan/desa) of one district — each row carries the full
 * hierarchy (province/regency/district names + codes) and `postal_codes`.
 * @param {string} districtCode - 6-digit district code
 */
export const listVillages = (districtCode) =>
  getListCached(`villages:${districtCode}`, `/districts/${districtCode}/villages`);

/**
 * Resolves a 10-digit village code to its full region hierarchy, via the
 * cached village list of its district (codes nest: the district code is the
 * village code's first 6 digits).
 * @param {string} villageCode
 * @returns {Promise<{ code: string, name: string, district_code: string, district: string,
 *   regency_code: string, regency: string, province_code: string, province: string,
 *   postal_codes?: string[] }>}
 * @throws {HttpError} 400 INVALID_VILLAGE when the code doesn't exist
 */
export const resolveVillage = async (villageCode) => {
  const villages = await listVillages(villageCode.slice(0, 6));
  const village = villages.find((row) => row.code === villageCode);
  if (!village) throw badRequest("INVALID_VILLAGE", "Unknown village code — pick an address from the region list");
  return village;
};

/**
 * Builds the snake→camel profile/origin address fields for a chosen village:
 * names and codes come from api.co.id (never client free-text), the postal
 * code must be one of the village's own (defaulting to its first).
 * @param {string} villageCode - 10-digit village code
 * @param {string} [postalCode] - optional buyer-chosen postal code
 * @returns {Promise<{ province: string, city: string, district: string, village: string,
 *   provinceCode: string, cityCode: string, districtCode: string, villageCode: string,
 *   postalCode: string | null }>}
 */
export const buildAddressFields = async (villageCode, postalCode) => {
  const village = await resolveVillage(villageCode);
  const validPostalCodes = village.postal_codes ?? [];
  if (postalCode && validPostalCodes.length > 0 && !validPostalCodes.includes(postalCode)) {
    throw badRequest("INVALID_POSTAL_CODE", "Postal code does not belong to the chosen village");
  }
  return {
    province: village.province,
    city: village.regency,
    district: village.district,
    village: village.name,
    provinceCode: village.province_code,
    cityCode: village.regency_code,
    districtCode: village.district_code,
    villageCode: village.code,
    postalCode: postalCode ?? validPostalCodes[0] ?? null,
  };
};
