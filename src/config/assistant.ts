/**
 * Telegram username of the "Mimin SiTIKET" assistant bot (backend
 * services/telegram-bot-service.js). Verified with the Bot API `getMe`.
 */
export const TELEGRAM_BOT_USERNAME = "sitiket_assistant_bot";

/** Deep link that opens the bot chat in Telegram. Example: `"https://t.me/sitiket_assistant_bot"` */
export const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`;

/** WhatsApp number of the same assistant bot, digits with country code. Example: `"6287882799692"` */
export const WHATSAPP_BOT_NUMBER = "6287882799692";

/** Human-readable form of {@link WHATSAPP_BOT_NUMBER}. Example: `"+62 878-8279-9692"` */
export const WHATSAPP_BOT_DISPLAY = "+62 878-8279-9692";

/** Deep link that opens the bot chat in WhatsApp. Example: `"https://wa.me/6287882799692"` */
export const WHATSAPP_BOT_URL = `https://wa.me/${WHATSAPP_BOT_NUMBER}`;
