import * as qrisConfigsRepository from "../repositories/qris-configs-repository.js";
import { badRequest, notFound } from "../utils/http-error.js";

/** @param {string} ownerId - always the calling admin's own id */
export const getMine = (ownerId) => qrisConfigsRepository.findByOwner(ownerId);

/**
 * Saves (creates or replaces) the owner's static QRIS code. The image is the
 * QRIS the organizer exported from their bank/PSP merchant app; buyers scan
 * it at payment time.
 * @param {string} ownerId
 * @param {{ merchantName: string, file?: { filename: string } }} input
 */
export const save = async (ownerId, { merchantName, file }) => {
  const existing = await qrisConfigsRepository.findByOwner(ownerId);
  if (!file && !existing) {
    throw badRequest("QRIS_IMAGE_REQUIRED", "Upload your QRIS code image to set up QRIS payments");
  }

  return qrisConfigsRepository.upsert(ownerId, {
    merchantName,
    // Keep the current image when only the merchant name changes.
    qrisImageUrl: file ? `/uploads/${file.filename}` : existing.qris_image_url,
  });
};

/** @param {string} ownerId */
export const remove = (ownerId) => qrisConfigsRepository.removeByOwner(ownerId);

/**
 * Owner-level toggles for where the QRIS code appears (ticket checkout,
 * merch checkout, both, or neither) — the QRIS counterpart of the same
 * per-checkout flags on bank accounts.
 * @param {string} ownerId
 * @param {{ showOnTicketCheckout?: boolean, showOnMerchCheckout?: boolean }} patch
 */
export const updateChannels = async (ownerId, patch) => {
  const existing = await qrisConfigsRepository.findByOwner(ownerId);
  if (!existing) {
    throw notFound("QRIS_CONFIG_NOT_FOUND", "Set up your QRIS code before choosing where to show it");
  }
  return qrisConfigsRepository.updateChannels(ownerId, patch);
};

/**
 * Resolves the QRIS payment option a buyer should see for an event: only
 * when the event opted in AND its organizer still has a QRIS config that is
 * shown on ticket checkout. Returns `null` (never throws) — QRIS is always
 * optional on top of bank transfer.
 * @param {{ owner_id: string, qris_enabled: number | boolean }} event
 */
export const resolveForEvent = async (event) => {
  if (!event.qris_enabled) return null;
  const config = await qrisConfigsRepository.findByOwner(event.owner_id);
  return config?.show_on_ticket_checkout ? config : null;
};
