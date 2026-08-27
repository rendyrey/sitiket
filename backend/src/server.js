import { app } from "./app.js";
import { env } from "./config/env.js";
import { isSemanticSearchEnabled, refreshStaleProductEmbeddings } from "./services/embedding-service.js";
import { completePastEvents } from "./services/event-service.js";
import { expireStaleMerchOrders } from "./services/merch-order-service.js";
import { expireStalePendingOrders } from "./services/order-service.js";
import { processEmailJobQueue } from "./services/email-job-service.js";

// Kept well under ORDER_PAYMENT_HOLD_MINUTES (10): the sweep is what sends the
// "payment window closed" email, so a coarse interval would make that mail land
// minutes after the countdown the buyer watched already hit zero.
const EXPIRY_SWEEP_INTERVAL_MS = 60 * 1000;
const EMAIL_QUEUE_POLL_INTERVAL_MS = 3 * 1000;

app.listen(env.PORT, () => console.log(`SiTIKET API listening on port ${env.PORT}`));

// Single-instance-friendly stand-in for a real job scheduler: releases
// inventory/promo holds for orders whose payment window lapsed with no
// proof ever submitted. See docs/business/PAYMENT_VERIFICATION.md.
setInterval(() => {
  expireStalePendingOrders().catch((error) => console.error("Failed to sweep expired orders:", error));
  // Merch orders share the sweep even though their hold is 24h, not 10min —
  // the query is cheap and the buyer's countdown stays honest to the minute.
  expireStaleMerchOrders().catch((error) => console.error("Failed to sweep expired merch orders:", error));
}, EXPIRY_SWEEP_INTERVAL_MS);

// Same single-instance stand-in pattern: delivers `email_jobs` rows queued
// by notification-service.js / email-verification-service.js so the request
// that triggers a notification never blocks on an SMTP round-trip.
setInterval(() => {
  processEmailJobQueue().catch((error) => console.error("Failed to process email job queue:", error));
}, EMAIL_QUEUE_POLL_INTERVAL_MS);

// Auto-archives events: published + end_date more than
// EVENT_AUTO_COMPLETE_GRACE_DAYS (default 2) in the past → "completed", which
// drops them from the public catalog. Hourly rather than daily on purpose:
// the grace-period cutoff does the precision work and the no-op query is
// cheap, while a 24h timer would lag a full day after every pm2 restart. The
// immediate first run catches anything that lapsed while the server was down.
const EVENT_COMPLETION_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
const sweepPastEvents = () =>
  completePastEvents().catch((error) => console.error("Failed to auto-complete past events:", error));
sweepPastEvents();
setInterval(sweepPastEvents, EVENT_COMPLETION_SWEEP_INTERVAL_MS);

// Semantic-search vectors refresh pull-based (new/edited products converge
// here) so product writes never block on the embeddings vendor. Interval only
// exists when a VOYAGE_API_KEY is configured.
const EMBEDDING_SWEEP_INTERVAL_MS = 60 * 1000;
if (isSemanticSearchEnabled()) {
  setInterval(() => {
    refreshStaleProductEmbeddings().catch((error) => console.error("Failed to refresh product embeddings:", error));
  }, EMBEDDING_SWEEP_INTERVAL_MS);
}
