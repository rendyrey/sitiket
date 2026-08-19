/**
 * Countdown maths for an order's payment window.
 *
 * The window itself is server-owned: `payment_expires_at` is stamped at
 * checkout from ORDER_PAYMENT_HOLD_MINUTES, the sweep in server.js expires the
 * order once it lapses, and order-payment-service.js refuses a proof upload
 * past that instant no matter what any browser believes. Everything here is
 * presentation only — it turns that absolute timestamp into the "7:42" a buyer
 * can act on while they are standing in their banking app.
 *
 * Deliberately free of React and of any implicit clock: the caller passes `now`,
 * so the formatting rules are unit-testable without faking timers.
 */

/** Below this much time left, the countdown switches to its urgent styling. */
export const URGENT_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Milliseconds left before `expiresAt`, clamped at zero.
 *
 * Returns `null` — not `0` — when the timestamp can't be parsed. A malformed
 * value means "we don't know", and rendering that as an expired window would
 * tell a buyer their tickets are gone while the server still holds them.
 *
 * @param expiresAt - ISO timestamp from `order.paymentExpiresAt`
 * @param now - epoch ms to measure against
 */
export function msRemaining(expiresAt: string, now: number): number | null {
  const target = new Date(expiresAt).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, target - now);
}

/**
 * Clock face for the digits on screen: "7:42", or "1:07:42" if an organizer
 * runs a hold longer than an hour.
 *
 * Seconds are rounded up so the display only reads 0:00 at the real deadline —
 * rounding down would show a zeroed clock for the final second, while the
 * server would still accept a proof.
 */
export function formatTimeLeft(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/**
 * The same information for a screen reader, coarsened to whole minutes.
 *
 * A live region re-announcing "6:41... 6:40... 6:39" every second would bury
 * the page under the timer. Phrasing that only changes once a minute means the
 * assistive announcement fires about once a minute too.
 */
export function formatTimeLeftSpoken(ms: number): string {
  if (ms <= 0) return "The payment window has closed.";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "Less than a minute left to pay.";
  if (minutes === 1) return "About 1 minute left to pay.";
  return `About ${minutes} minutes left to pay.`;
}
