import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

/**
 * Signs a ticket's identity into the payload encoded in its QR code, so a
 * scanner can reject a forged/altered code before ever hitting the database.
 * See docs/business/CHECKIN_GATE_SYSTEM.md §2.
 *
 * @param {{ ticketCode: string, eventId: string }} payload
 * @returns {string} `"<ticketCode>.<eventId>.<hmacSignatureHex>"`
 */
export const signQrPayload = ({ ticketCode, eventId }) => {
  const body = `${ticketCode}.${eventId}`;
  const signature = createHmac("sha256", env.QR_SIGNING_SECRET).update(body).digest("hex");
  return `${body}.${signature}`;
};

/**
 * Verifies a scanned QR payload's signature and extracts its identity.
 * @param {string} qrPayload - Raw string decoded from the scanned QR code.
 * @returns {{ ticketCode: string, eventId: string } | null} `null` if the signature is missing/invalid.
 */
export const verifyQrPayload = (qrPayload) => {
  if (typeof qrPayload !== "string") return null;

  const parts = qrPayload.split(".");
  if (parts.length !== 3) return null;

  const [ticketCode, eventId, signature] = parts;
  const body = `${ticketCode}.${eventId}`;
  const expected = createHmac("sha256", env.QR_SIGNING_SECRET).update(body).digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(signature, "hex");
  if (expectedBuffer.length !== providedBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, providedBuffer)) return null;

  return { ticketCode, eventId };
};
