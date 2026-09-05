import { Router } from "express";
import * as merchPromoCodeController from "../controllers/merch-promo-code-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import {
  createMerchPromoCodeSchema,
  updateMerchPromoCodeSchema,
  validateMerchPromoCodeSchema,
} from "../schemas/merch-promo-code-schemas.js";

export const merchPromoCodeRouter = Router();

merchPromoCodeRouter.use(requireAuth);

// Buyer-facing checkout preview — any signed-in buyer, for any seller's code.
merchPromoCodeRouter.post(
  "/validate",
  writeLimiter,
  validate(validateMerchPromoCodeSchema),
  merchPromoCodeController.validate,
);

// Seller (or super_admin) management of their own store's codes.
merchPromoCodeRouter.get("/", requireRole("admin", "super_admin"), merchPromoCodeController.list);
merchPromoCodeRouter.post(
  "/",
  requireRole("admin", "super_admin"),
  validate(createMerchPromoCodeSchema),
  merchPromoCodeController.create,
);
merchPromoCodeRouter.patch(
  "/:id",
  requireRole("admin", "super_admin"),
  validate(updateMerchPromoCodeSchema),
  merchPromoCodeController.update,
);
