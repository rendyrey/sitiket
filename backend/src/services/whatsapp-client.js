import { env } from "../config/env.js";

/**
 * WhatsApp's per-message text limit; longer bodies are rejected by the API.
 * Example: a 5000-char LLM reply is cut to 4096 chars.
 */
const MAX_TEXT_LENGTH = 4096;

/**
 * Absolute Graph API URL for one path.
 * @param {string} path - Example: `"1395472303641057/messages"`
 * @returns {string} Example: `"https://graph.facebook.com/v23.0/1395472303641057/messages"`
 */
const graphUrl = (path) => `https://graph.facebook.com/${env.WHATSAPP_GRAPH_API_VERSION}/${path}`;

/** Bearer header for every Graph call — also required to download media bytes. */
const authHeaders = () => ({ Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` });

/** @returns {boolean} true when outbound WhatsApp sends are possible. */
export const isWhatsappSendConfigured = () => Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);

/**
 * POSTs one message payload to the sender number's /messages endpoint.
 * @param {string} to - recipient `wa_id`. Example: `"628112003717"`
 * @param {object} message - type-specific fields. Example: `{ type: "text", text: { body: "Halo" } }`
 * @throws {Error} when the Graph API rejects the send (expired token, closed 24h window, bad number).
 */
const postMessage = async (to, message) => {
  const response = await fetch(graphUrl(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`), {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, ...message }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`WhatsApp send to ${to} failed (${response.status}): ${detail.slice(0, 300)}`);
  }
};

/**
 * Sends a free-form text message. Only valid inside the 24h customer-service
 * window, which is always open here: the bot only ever replies to a message
 * the user just sent.
 *
 * @param {string} to - recipient `wa_id`. Example: `"628112003717"`
 * @param {string} body - message text; WhatsApp formatting (`*bold*`) allowed.
 * @throws {Error} when the Graph API rejects the send (expired token, bad number).
 */
export const sendText = (to, body) => postMessage(to, { type: "text", text: { body: body.slice(0, MAX_TEXT_LENGTH) } });

/** File extension per image type WhatsApp accepts for image messages (no WebP — that's stickers only). */
const IMAGE_EXTENSIONS = { "image/png": "png", "image/jpeg": "jpg" };

/**
 * Uploads an image to WhatsApp's media store and sends it as an image
 * message — no public URL needed. Same 24h-window rule as {@link sendText}.
 *
 * @param {string} to - recipient `wa_id`. Example: `"628112003717"`
 * @param {Buffer} bytes - image bytes. Example: a ticket QR code PNG
 * @param {"image/png" | "image/jpeg"} mimeType
 * @param {string} caption - shown under the image. Example: `"Tiket 1/2 — Festival"`
 * @throws {Error} when the upload or the send fails.
 */
export const sendImage = async (to, bytes, mimeType, caption) => {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", mimeType);
  form.append("file", new Blob([bytes], { type: mimeType }), `image.${IMAGE_EXTENSIONS[mimeType]}`);
  const uploadResponse = await fetch(graphUrl(`${env.WHATSAPP_PHONE_NUMBER_ID}/media`), {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text().catch(() => "");
    throw new Error(`WhatsApp media upload failed (${uploadResponse.status}): ${detail.slice(0, 300)}`);
  }
  /** Example: `{ id: "1234567890123456" }` */
  const { id } = await uploadResponse.json();
  await postMessage(to, { type: "image", image: { id, caption } });
};

/**
 * Downloads an inbound media file (e.g. a payment-proof photo). Two hops:
 * the media id resolves to a short-lived URL, and that URL itself needs the
 * same bearer token.
 *
 * @param {string} mediaId - `messages[].image.id` from the webhook. Example: `"1234567890123456"`
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>} Example mimeType: `"image/jpeg"`
 * @throws {Error} when either hop fails.
 */
export const downloadMedia = async (mediaId) => {
  const metaResponse = await fetch(graphUrl(encodeURIComponent(mediaId)), { headers: authHeaders() });
  if (!metaResponse.ok) {
    throw new Error(`WhatsApp media lookup ${mediaId} failed (${metaResponse.status})`);
  }
  /** Example: `{ url: "https://lookaside.fbsbx.com/…", mime_type: "image/jpeg" }` */
  const media = await metaResponse.json();

  const fileResponse = await fetch(media.url, { headers: authHeaders() });
  if (!fileResponse.ok) {
    throw new Error(`WhatsApp media download ${mediaId} failed (${fileResponse.status})`);
  }
  return { buffer: Buffer.from(await fileResponse.arrayBuffer()), mimeType: media.mime_type };
};
