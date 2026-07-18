import { app } from "./app.js";
import { env } from "./config/env.js";
import { expireStalePendingOrders } from "./services/order-service.js";

const EXPIRY_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

app.listen(env.PORT, () => console.log(`SiTIKET API listening on port ${env.PORT}`));

// Single-instance-friendly stand-in for a real job scheduler: releases
// inventory/promo holds for orders whose payment window lapsed with no
// proof ever submitted. See docs/business/PAYMENT_VERIFICATION.md.
setInterval(() => {
  expireStalePendingOrders().catch((error) => console.error("Failed to sweep expired orders:", error));
}, EXPIRY_SWEEP_INTERVAL_MS);
