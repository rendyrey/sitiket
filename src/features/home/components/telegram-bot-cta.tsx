import { PiTelegramLogoFill } from "react-icons/pi";
import { TELEGRAM_BOT_URL, TELEGRAM_BOT_USERNAME } from "@/config/assistant";
import TelegramQr from "./telegram-qr";

/** What the bot does, one line each. */
const PERKS = ["Find events & check ticket prices", "Buy tickets & merch in the chat", "Get your QR tickets right in Telegram"];

/**
 * Landing-page invitation to the "Mimin SiTIKET" Telegram bot: a QR code to
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
            ON TELEGRAM.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-ink/70">
            Chat with Mimin SiTIKET — no app to install, replies in seconds (in Bahasa Indonesia).
          </p>
          <ul className="mt-6 space-y-2">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm font-bold uppercase tracking-wide">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 bg-ink" />
                <span className="min-w-0">{perk}</span>
              </li>
            ))}
          </ul>
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-large mt-8 w-full border-ink bg-ink text-lime hover:border-ink hover:bg-white hover:text-ink xs:w-auto"
          >
            <PiTelegramLogoFill aria-hidden className="size-5" />
            Open in Telegram
          </a>
        </div>

        <figure className="mx-auto w-full max-w-[260px] border-2 border-ink bg-white p-4 shadow-[8px_8px_0_#0a0a0a] sm:max-w-[300px] lg:mx-0">
          <TelegramQr value={TELEGRAM_BOT_URL} label="QR code to open Mimin SiTIKET on Telegram" />
          <figcaption className="mt-3 border-t-2 border-ink pt-3 text-center">
            <span className="block text-[10px] font-black uppercase tracking-[.18em] text-ink/55">Scan to chat</span>
            <span className="mt-1 block truncate text-sm font-black">@{TELEGRAM_BOT_USERNAME}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
