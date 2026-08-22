import { Router } from "express";
import * as shippingController from "../controllers/shipping-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { saveShippingOriginSchema } from "../schemas/shipping-schemas.js";

/**
 * The seller's shipping departure address (one per owner) — mandatory before
 * creating merch products. No DELETE on purpose: removing the origin would
 * strand live products with no quotable departure point.
 */
export const shippingOriginRouter = Router();

shippingOriginRouter.use(requireAuth, requireRole("admin", "super_admin"));

shippingOriginRouter.get("/", shippingController.getMyOrigin);
shippingOriginRouter.put("/", validate(saveShippingOriginSchema), shippingController.saveMyOrigin);
