import { env } from "../config/env.js";

// Minimal Telegram Bot API client (plain fetch, no SDK) for the Telegram
// channel of the assistant (services/telegram-bot-service.js).

/** Telegram's per-message text limit. */
const MAX_TEXT_LENGTH = 4096;
/** Caption limit on photo messages. */
const MAX_CAPTION_LENGTH = 1024;

/** @returns {boolean} true when a bot token is configured. */
export const isTelegramConfigured = () => Boolean(env.TELEGRAM_BOT_TOKEN);

/**
 * @param {string} method - Bot API method. Example: `"sendMessage"`
 * @returns {string} Example: `"https://api.telegram.org/bot123:ABC/sendMessage"`
 */
const methodUrl = (method) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;

/**
 * Calls a Bot API method and unwraps `result`.
 * @param {string} method - Example: `"getUpdates"`
 * @param {object | FormData} [payload] - JSON body, or FormData for uploads
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<any>} Telegram's `result`
 * @throws {Error} with Telegram's `description` and `error_code` on failure
 */
export const callTelegram = async (method, payload = {}, options = {}) => {
  const isForm = payload instanceof FormData;
  const response = await fetch(methodUrl(method), {
    method: "POST",
    headers: isForm ? undefined : { "Content-Type": "application/json" },
    body: isForm ? payload : JSON.stringify(payload),
    signal: options.signal,
  });
  const json = await response.json().catch(() => ({}));
  if (!json.ok) {
    const error = new Error(`Telegram ${method} failed (${json.error_code ?? response.status}): ${json.description ?? "no description"}`);
    error.errorCode = json.error_code ?? response.status;
    throw error;
  }
  return json.result;
};

/**
 * The assistant writes WhatsApp-style text (`*bold*`); Telegram renders that
 * via HTML parse mode. Everything is escaped first so user/model text can
 * never inject markup.
 * @param {string} text - Example: `"Total *Rp150.000* <ok>"`
 * @returns {string} Example: `"Total <b>Rp150.000</b> &lt;ok&gt;"`
 */
export const toTelegramHtml = (text) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*([^*\n]+)\*/g, "<b>$1</b>");

/**
 * Sends a text message. Falls back to plain text if Telegram rejects the
 * formatting, so a reply is never lost to a markup edge case.
 * @param {string | number} chatId - Example: `"123456789"`
 * @param {string} text - WhatsApp-style formatted text
 * @param {object} [replyMarkup] - keyboard. Example: `{ remove_keyboard: true }`
 */
export const sendTelegramText = async (chatId, text, replyMarkup) => {
  const body = text.slice(0, MAX_TEXT_LENGTH);
  const base = { chat_id: chatId, link_preview_options: { is_disabled: true }, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) };
  try {
    await callTelegram("sendMessage", { ...base, text: toTelegramHtml(body), parse_mode: "HTML" });
  } catch (error) {
    if (error.errorCode !== 400) throw error;
    await callTelegram("sendMessage", { ...base, text: body });
  }
};

/**
 * Uploads and sends one photo.
 * @param {string | number} chatId - Example: `"123456789"`
 * @param {Buffer} bytes - JPEG or PNG
 * @param {"image/jpeg" | "image/png"} mimeType
 * @param {string} caption - Example: `"Tiket 1/2 — Festival"`
 */
export const sendTelegramPhoto = async (chatId, bytes, mimeType, caption) => {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption.slice(0, MAX_CAPTION_LENGTH));
  form.append("photo", new Blob([bytes], { type: mimeType }), mimeType === "image/png" ? "photo.png" : "photo.jpg");
  await callTelegram("sendPhoto", form);
};

/**
 * Downloads a file a user sent (e.g. a payment-proof photo).
 * @param {string} fileId - `message.photo[].file_id`. Example: `"AgACAgUAAxkBAAIB…"`
 * @returns {Promise<Buffer>}
 */
export const downloadTelegramFile = async (fileId) => {
  const { file_path: filePath } = await callTelegram("getFile", { file_id: fileId });
  const response = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`);
  if (!response.ok) throw new Error(`Telegram file download failed (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
};

/**
 * Long-polls for new updates.
 * @param {number} offset - first update id to return. Example: `817263540`
 * @param {number} timeoutSeconds - how long Telegram holds the request open when idle. Example: `50`
 * @returns {Promise<Array<object>>} Telegram `Update` objects
 */
export const getTelegramUpdates = (offset, timeoutSeconds) =>
  callTelegram(
    "getUpdates",
    { offset, timeout: timeoutSeconds, allowed_updates: ["message"] },
    // A little longer than Telegram's hold, so an idle poll never aborts early.
    { signal: AbortSignal.timeout((timeoutSeconds + 15) * 1000) },
  );
