import * as qrisConfigsRepository from "../repositories/qris-configs-repository.js";
import { badRequest } from "../utils/http-error.js";

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
 * Resolves the QRIS payment option a buyer should see for an event: only
 * when the event opted in AND its organizer still has a QRIS config. Returns
 * `null` (never throws) — QRIS is always optional on top of bank transfer.
 * @param {{ owner_id: string, qris_enabled: number | boolean }} event
 */
export const resolveForEvent = async (event) => {
  if (!event.qris_enabled) return null;
  return (await qrisConfigsRepository.findByOwner(event.owner_id)) ?? null;
};
