import { Router } from "express";
import * as promoCodeController from "../controllers/promo-code-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createPromoCodeSchema, updatePromoCodeSchema } from "../schemas/promo-code-schemas.js";

// mergeParams so `:eventId` from the parent mount (see app.js) is visible here.
export const promoCodeRouter = Router({ mergeParams: true });

promoCodeRouter.use(requireAuth, requireRole("admin", "super_admin"));

promoCodeRouter.get("/", promoCodeController.list);
promoCodeRouter.post("/", validate(createPromoCodeSchema), promoCodeController.create);
promoCodeRouter.patch("/:promoCodeId", validate(updatePromoCodeSchema), promoCodeController.update);
