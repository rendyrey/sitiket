import { Router } from "express";
import * as onsiteSalesController from "../controllers/onsite-sales-controller.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { recordOnsiteSaleSchema } from "../schemas/onsite-sales-schemas.js";

// mergeParams so `:eventId` from the parent mount (see app.js) is visible here.
// No requireRole — gate staff can be plain "user" accounts; the service
// authorizes via the shared gate-crew check.
export const onsiteSalesRouter = Router({ mergeParams: true });

onsiteSalesRouter.use(requireAuth);

onsiteSalesRouter.get("/", onsiteSalesController.list);
onsiteSalesRouter.post("/", writeLimiter, validate(recordOnsiteSaleSchema), onsiteSalesController.record);
onsiteSalesRouter.delete("/:saleId", onsiteSalesController.remove);
