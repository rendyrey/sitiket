import rateLimit from "express-rate-limit";

/** Guards the Google sign-in endpoint against credential-stuffing/brute-force attempts. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Guards the website assistant per client IP — each message costs LLM tokens,
 * and guests can mint a fresh chat id (and so a fresh per-chat flood budget)
 * at will. 40 per 10 min comfortably covers a full in-chat merch checkout.
 */
export const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Guards order creation and gate check-in scans — both are cheap to hammer otherwise. */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
