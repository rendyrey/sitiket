import { PiTelegramLogoFill, PiWhatsappLogoFill } from "react-icons/pi";
import {
  TELEGRAM_BOT_URL,
  TELEGRAM_BOT_USERNAME,
  WHATSAPP_BOT_DISPLAY,
  WHATSAPP_BOT_URL,
} from "@/config/assistant";
import TelegramQr from "./telegram-qr";

/** What the bot does, one line each. */
const PERKS = ["Find events & check ticket prices", "Buy tickets & merch in the chat", "Get your QR tickets right in the chat"];

/** The chat apps the bot runs on; each gets a scannable QR and a direct button. */
const CHANNELS = [
  { name: "WhatsApp", url: WHATSAPP_BOT_URL, handle: WHATSAPP_BOT_DISPLAY, Icon: PiWhatsappLogoFill },
  { name: "Telegram", url: TELEGRAM_BOT_URL, handle: `@${TELEGRAM_BOT_USERNAME}`, Icon: PiTelegramLogoFill },
];

/**
 * Landing-page invitation to the "Mimin SiTIKET" WhatsApp and Telegram bots: a QR code to
 * scan from a desktop, and a direct button for phones (which can't scan their
 * own screen).
 */
export default function TelegramBotCta() {
  return (
    <section aria-labelledby="telegram-bot-heading" className="section-space overflow-hidden bg-lime text-ink">
      <div className="site-container grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
        <div className="min-w-0">
          <span className="section-index text-ink/60">03 / ASK MIMIN</span>
          <h2 id="telegram-bot-heading" className="mt-4 text-4xl font-black uppercase leading-[.95] xs:text-5xl sm:text-7xl">
            YOUR TICKET HELPER,
            <br />
            IN YOUR CHAT.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-ink/70">
            Chat with Mimin SiTIKET on WhatsApp or Telegram — no app to install, replies in seconds (in Bahasa Indonesia).
          </p>
          <ul className="mt-6 space-y-2">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm font-bold uppercase tracking-wide">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 bg-ink" />
                <span className="min-w-0">{perk}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 xs:flex-row xs:flex-wrap">
            {CHANNELS.map(({ name, url, Icon }) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="button button-large w-full border-ink bg-ink text-lime hover:border-ink hover:bg-white hover:text-ink xs:w-auto"
              >
                <Icon aria-hidden className="size-5" />
                Open in {name}
              </a>
            ))}
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-[540px] grid-cols-1 gap-6 xs:grid-cols-2 lg:mx-0">
          {CHANNELS.map(({ name, url, handle }) => (
            <figure key={name} className="mx-auto w-full max-w-[260px] border-2 border-ink bg-white p-4 shadow-[8px_8px_0_#0a0a0a]">
              <TelegramQr value={url} label={`QR code to open Mimin SiTIKET on ${name}`} />
              <figcaption className="mt-3 border-t-2 border-ink pt-3 text-center">
                <span className="block text-[10px] font-black uppercase tracking-[.18em] text-ink/55">Scan · {name}</span>
                <span className="mt-1 block truncate text-sm font-black">{handle}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
