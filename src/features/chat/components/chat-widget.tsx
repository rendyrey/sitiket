"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { PiChatCircleDotsFill, PiPaperPlaneRightFill, PiSignInBold, PiXBold } from "react-icons/pi";
import { useSession } from "@/features/auth/lib/use-session";
import { toAssetUrl } from "@/lib/public-env";
import { sendChatMessageAction } from "../lib/actions";
import type { ChatEntry } from "../lib/types";
import ChatMessageText from "./chat-message-text";

/** First bubble every chat opens with — static, so opening the panel costs no LLM call. */
const GREETING: ChatEntry = {
  id: "greeting",
  role: "assistant",
  text: "Halo Kak! 👋 Mimin SiTIKET di sini. Mau cari event, cek harga tiket, lihat merch, atau cek status pesanan? Tanya aja, ya.",
};
/** One-tap starters shown until the user sends their first message. */
const QUICK_PROMPTS = ["Event apa saja?", "Merch terbaru", "Status pesanan saya"];
/** Longest message the backend accepts (schemas/chat-schemas.js). */
const MAX_MESSAGE_LENGTH = 1500;
/** Bubbles kept in localStorage per user, newest last. */
const MAX_STORED_ENTRIES = 40;
/** Routes where a floating button would get in the way (print labels, the camera scanner). */
const HIDDEN_PATH_PREFIXES = ["/print", "/dashboard/scan"];
/** localStorage key of the guest chat id. */
const CHAT_ID_KEY = "sitiket-chat-id";
/** localStorage key prefix of the visible history; suffixed per user so accounts never see each other's bubbles. */
const HISTORY_KEY_PREFIX = "sitiket-chat-history:";
/** Shown when the Server Action itself fails (network/deploy), not an API error. */
const NETWORK_ERROR = "Maaf Kak, pesannya belum terkirim. Periksa koneksi lalu coba lagi, ya.";

/**
 * Reads a JSON value from localStorage, tolerating private mode / blocked storage.
 * @param key - Example: `"sitiket-chat-history:guest"`
 */
const readStorage = <T,>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

/** @param key - localStorage key @param value - JSON-serializable value */
const writeStorage = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — the chat still works, it just won't survive a reload.
  }
};

/** The browser's persistent chat id (keys guest history on the backend). */
const getChatId = (): string => {
  const stored = readStorage<string>(CHAT_ID_KEY);
  if (stored) return stored;
  const created = crypto.randomUUID();
  writeStorage(CHAT_ID_KEY, created);
  return created;
};

/**
 * Floating "Mimin SiTIKET" assistant — the website channel of the same
 * assistant as the WhatsApp bot (backend services/web-chat-service.js, same
 * MCP tools). Guests can ask anything; ordering and order status need a
 * sign-in, which the panel offers inline. Full-screen sheet on phones, a
 * docked card from `sm` up.
 */
export default function ChatWidget() {
  const pathname = usePathname() ?? "/";
  const user = useSession();
  if (HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  /** localStorage key of this viewer's visible history. Example: `"sitiket-chat-history:7f3c…"` */
  const historyKey = `${HISTORY_KEY_PREFIX}${user?.id ?? "guest"}`;
  // Keyed per viewer: signing in/out remounts the panel with that viewer's own history.
  return <ChatAssistant key={historyKey} historyKey={historyKey} isSignedIn={Boolean(user)} pathname={pathname} />;
}

/** Props of {@link ChatAssistant}. */
interface ChatAssistantProps {
  /** localStorage key of this viewer's bubbles. Example: `"sitiket-chat-history:guest"` */
  historyKey: string;
  /** Shows the inline sign-in prompt when false. */
  isSignedIn: boolean;
  /** Current route, sent back to after signing in. Example: `"/events/jazz-night"` */
  pathname: string;
}

/** The launcher + panel for one viewer. */
function ChatAssistant({ historyKey, isSignedIn, pathname }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Restored once per viewer (see the key in ChatWidget). The panel starts closed, so the
  // server-rendered markup never includes these bubbles and there's no hydration mismatch.
  const [entries, setEntries] = useState<ChatEntry[]>(() => readStorage<ChatEntry[]>(historyKey) ?? [GREETING]);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  // Persist bubbles, capped, after every change.
  useEffect(() => {
    writeStorage(historyKey, entries.slice(-MAX_STORED_ENTRIES));
  }, [entries, historyKey]);

  // Keep the newest bubble in view.
  useEffect(() => {
    if (isOpen) listEndRef.current?.scrollIntoView({ block: "end" });
  }, [entries, isPending, isOpen]);

  // Focus the input on open; lock page scroll behind the full-screen phone sheet; Escape closes.
  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const isPhone = window.matchMedia("(max-width: 639px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (isPhone) document.body.style.overflow = "hidden";
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  /** Closes the panel and hands focus back to the launcher. */
  function close() {
    setIsOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }

  /** @param entry - bubble to append */
  const append = (entry: ChatEntry) => setEntries((current) => [...current, entry]);

  /**
   * Sends one message and appends the assistant's reply (or an error bubble).
   * @param text - Example: `"Event apa saja?"`
   */
  const send = (text: string) => {
    const message = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!message || isPending) return;
    append({ id: `u-${Date.now()}`, role: "user", text: message });
    setDraft("");
    startTransition(async () => {
      try {
        const result = await sendChatMessageAction(getChatId(), message);
        append(
          result.ok
            ? { id: `a-${Date.now()}`, role: "assistant", text: result.data.reply, attachments: result.data.attachments }
            : { id: `e-${Date.now()}`, role: "assistant", text: result.message, isError: true },
        );
      } catch {
        append({ id: `e-${Date.now()}`, role: "assistant", text: NETWORK_ERROR, isError: true });
      }
    });
  };

  /** @param event - form submit */
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
  };

  /** Enter sends, Shift+Enter adds a line. @param event - textarea keydown */
  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(draft);
    }
  };

  const showQuickPrompts = entries.every((entry) => entry.role === "assistant") && !isPending;

  return (
    <div className="print:hidden">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="launcher"
            ref={launcherRef}
            type="button"
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            aria-label="Chat dengan Mimin SiTIKET"
            // Ink with a lime rim: stays visible on the lime /events hero, the dark home hero and white pages alike.
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex size-14 items-center justify-center border-2 border-lime bg-ink text-lime shadow-[4px_4px_0_rgba(10,10,10,0.35)] transition-[transform,background-color,color] hover:-translate-y-0.5 hover:bg-lime hover:text-ink focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink sm:right-6 sm:bottom-6"
          >
            <PiChatCircleDotsFill aria-hidden className="size-7" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.section
            key="panel"
            role="dialog"
            aria-modal="false"
            aria-label="Chat Mimin SiTIKET"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[60] flex flex-col bg-paper text-ink sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh-3rem))] sm:w-[380px] sm:border-2 sm:border-ink sm:shadow-[6px_6px_0_#0a0a0a]"
          >
            <header className="flex items-center gap-3 border-b-4 border-lime bg-ink px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:pt-3">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center bg-lime text-lg font-black text-black">
                M
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black uppercase tracking-wide">Mimin SiTIKET</p>
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-white/60">
                  <span aria-hidden className="size-1.5 rounded-full bg-lime" />
                  Asisten tiket & merch
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup chat"
                className="inline-flex size-11 shrink-0 items-center justify-center border-2 border-white/20 transition-colors hover:border-lime hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime"
              >
                <PiXBold aria-hidden className="size-5" />
              </button>
            </header>

            {!isSignedIn && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink/10 bg-white px-4 py-2">
                <p className="min-w-0 flex-1 text-xs font-bold text-ink/70">Masuk untuk pesan tiket, merch & cek pesanan.</p>
                <Link
                  href={`/login?redirect=${encodeURIComponent(pathname)}`}
                  className="button button-dark min-h-9 px-3 text-[10px]"
                >
                  <PiSignInBold aria-hidden className="size-4" />
                  Masuk
                </Link>
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4" aria-live="polite" aria-busy={isPending}>
              {entries.map((entry) => (
                <div key={entry.id} className={entry.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={[
                      "max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere]",
                      entry.role === "user"
                        ? "bg-ink text-white"
                        : entry.isError
                          ? "border-2 border-red-500 bg-white text-red-700"
                          : "border-2 border-ink/10 bg-white text-ink",
                    ].join(" ")}
                  >
                    {entry.role === "user" ? <p className="whitespace-pre-wrap">{entry.text}</p> : <ChatMessageText text={entry.text} />}
                    {entry.attachments?.length ? (
                      <div className="mt-2 grid gap-2">
                        {entry.attachments.map((attachment) => (
                          <figure key={attachment.url} className="border-2 border-ink/10 bg-paper">
                            <Image
                              src={toAssetUrl(attachment.url)}
                              alt={attachment.caption}
                              width={480}
                              height={480}
                              sizes="(min-width: 640px) 300px, 80vw"
                              className="aspect-square h-auto w-full object-cover"
                            />
                            <figcaption className="px-2 py-1.5 text-[11px] font-bold text-ink/70">{attachment.caption}</figcaption>
                          </figure>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {isPending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 border-2 border-ink/10 bg-white px-4 py-3" aria-label="Mimin sedang mengetik">
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={dot}
                        className="size-2 rounded-full bg-ink/60"
                        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {showQuickPrompts && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => send(prompt)}
                      className="min-h-11 border-2 border-ink bg-white px-3 text-xs font-black uppercase tracking-wide transition-colors hover:bg-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              <div ref={listEndRef} />
            </div>

            <form
              onSubmit={onSubmit}
              className="flex items-end gap-2 border-t-2 border-ink bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-2"
            >
              <label htmlFor="sitiket-chat-input" className="sr-only">
                Tulis pesan
              </label>
              <textarea
                id="sitiket-chat-input"
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onInputKeyDown}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Tulis pesan…"
                className="max-h-32 min-h-11 min-w-0 flex-1 resize-none border-2 border-ink bg-paper px-3 py-2.5 text-sm leading-5 outline-none placeholder:text-ink/40 focus:border-ink focus:bg-white focus-visible:ring-2 focus-visible:ring-lime [field-sizing:content]"
              />
              <button
                type="submit"
                disabled={isPending || !draft.trim()}
                aria-label="Kirim pesan"
                className="inline-flex size-11 shrink-0 items-center justify-center border-2 border-ink bg-lime text-black transition-colors hover:bg-ink hover:text-lime disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-lime disabled:hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <PiPaperPlaneRightFill aria-hidden className="size-5" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
