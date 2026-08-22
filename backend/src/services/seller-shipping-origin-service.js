import * as sellerShippingOriginsRepository from "../repositories/seller-shipping-origins-repository.js";
import { buildAddressFields } from "./regional-service.js";

/**
 * The seller's (event organizer's) shipping departure address — mandatory
 * before selling merch (product-service.js gates product creation on it) and
 * the origin of every shipping-cost quote for that seller's orders.
 */

/** @param {string} ownerId @returns {Promise<object | null>} the owner's origin row, or null */
export const getMine = async (ownerId) => (await sellerShippingOriginsRepository.findByOwner(ownerId)) ?? null;

/**
 * Creates or replaces the owner's departure address. The client only chooses
 * a village + street detail — the full region hierarchy (names, codes,
 * postal code) is resolved server-side from api.co.id so the stored origin
 * is always quotable.
 * @param {string} ownerId
 * @param {{ villageCode: string, address: string, postalCode?: string, enabledCouriers?: string[] | null }} input
 */
export const save = async (ownerId, input) => {
  const region = await buildAddressFields(input.villageCode, input.postalCode);
  return sellerShippingOriginsRepository.upsert(ownerId, {
    ...region,
    address: input.address,
    enabledCouriers: input.enabledCouriers ?? null,
  });
};
