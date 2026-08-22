import { Router } from "express";
import * as shippingController from "../controllers/shipping-controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { shippingQuoteSchema } from "../schemas/shipping-schemas.js";

/** Checkout shipping quotes — signed-in buyers only (quotes need their saved address). */
export const shippingRouter = Router();

shippingRouter.use(requireAuth);

shippingRouter.post("/quotes", validate(shippingQuoteSchema), shippingController.quote);
shippingRouter.get("/couriers", shippingController.listCouriers);
