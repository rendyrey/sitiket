import rateLimit from "express-rate-limit";

/** Guards the Google sign-in endpoint against credential-stuffing/brute-force attempts. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
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
