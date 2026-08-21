"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { URGENT_THRESHOLD_MS, formatTimeLeft, formatTimeLeftSpoken, msRemaining } from "../lib/payment-window";

/**
 * How often to re-check the server once the clock hits zero. The sweep in
 * server.js runs every minute, so the real `expired` status lands shortly after.
 */
const CLOSED_REFRESH_INTERVAL_MS = 15_000;
/** Bound on those refreshes, so a stalled sweep can't leave a page polling forever. */
const MAX_CLOSED_REFRESHES = 10;

/**
 * The live "time left to pay" clock on the order status page.
 *
 * A bank transfer is a task the buyer performs in another app, so the one thing
 * they need from this page is how long they have before the hold lapses and the
 * tickets go back on sale. Rendered only while the order is `pending_payment` —
 * once a proof is in, the deadline no longer applies to them.
 *
 * This clock is advisory. It runs off the buyer's own device clock, so a skewed
 * device shows a skewed number; the server is always the authority on whether a
 * proof arrived in time.
 */
export default function PaymentWindowCountdown({
  expiresAt,
  // Ticket copy by default; the merch order page overrides both (its hold
  // releases product stock, not seats).
  closedMessage = "Your reserved tickets are being released back for sale, and we've emailed you to say so. You can start a fresh order any time — subject to what's still available.",
  openMessage = "Transfer the total and upload your proof of payment before this runs out. After that the tickets are released back for sale and you'd need to order again.",
}: {
  expiresAt: string;
  closedMessage?: string;
  openMessage?: string;
}) {
  const router = useRouter();
  // Seeded during render, so the server-rendered HTML already carries a real
  // number rather than a placeholder that pops in on hydration. The initialiser
  // runs again on the client during hydration — measured against the buyer's own
  // clock — so the first interactive frame is already accurate and no
  // correcting setState is needed here.
  const [remaining, setRemaining] = useState(() => msRemaining(expiresAt, Date.now()));

  useEffect(() => {
    // Each tick recomputes from the absolute deadline rather than decrementing,
    // so a throttled background tab resumes on the right number instead of a
    // drifted one.
    const tick = setInterval(() => setRemaining(msRemaining(expiresAt, Date.now())), 1000);
    return () => clearInterval(tick);
  }, [expiresAt]);

  const hasClosed = remaining !== null && remaining <= 0;
  const refreshes = useRef(0);

  useEffect(() => {
    if (!hasClosed) return;
    // Pull the real status down rather than sitting on a dead 0:00. The parent
    // stops rendering this component once the order is no longer awaiting
    // payment, which unmounts it and ends the polling.
    router.refresh();
    const poll = setInterval(() => {
      refreshes.current += 1;
      if (refreshes.current >= MAX_CLOSED_REFRESHES) {
        clearInterval(poll);
        return;
      }
      router.refresh();
    }, CLOSED_REFRESH_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [hasClosed, router]);

  // Unparseable timestamp — say nothing rather than invent a deadline.
  if (remaining === null) return null;

  const isUrgent = remaining <= URGENT_THRESHOLD_MS;

  return (
    <div
      className={`border-2 p-5 sm:p-7 ${isUrgent ? "border-red-600 bg-red-500/5" : "border-ink bg-white"}`}
      // The digits differ between the server render and hydration by design —
      // time passed in between. Suppressing keeps that off the console.
      suppressHydrationWarning
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <span className={`tag ${isUrgent ? "!bg-red-600 !text-white" : ""}`}>
          {hasClosed ? "Payment window closed" : "Time left to pay"}
        </span>
        {!hasClosed && (
          <strong
            aria-hidden="true"
            className={`text-4xl font-black tabular-nums leading-none ${isUrgent ? "text-red-600" : ""}`}
            suppressHydrationWarning
          >
            {formatTimeLeft(remaining)}
          </strong>
        )}
      </div>
      <p className="mt-4 text-sm text-black/60">{hasClosed ? closedMessage : openMessage}</p>
      {/* Announced roughly once a minute — see formatTimeLeftSpoken. */}
      <span className="sr-only" aria-live="polite" role="status">
        {formatTimeLeftSpoken(remaining)}
      </span>
    </div>
  );
}
