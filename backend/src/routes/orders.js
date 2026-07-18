import { Router } from "express";
import * as orderController from "../controllers/order-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { createOrderSchema, guestOrderLookupQuerySchema, verifyGuestOtpSchema } from "../schemas/order-schemas.js";

export const orderRouter = Router();

orderRouter.post("/", writeLimiter, optionalAuth, validate(createOrderSchema), orderController.create);

orderRouter.post("/:id/verify-guest-email", validate(verifyGuestOtpSchema), orderController.verifyGuestEmail);

orderRouter.get("/mine", requireAuth, orderController.listMine);

orderRouter.get("/:id/guest", validate(guestOrderLookupQuerySchema, "query"), orderController.getForGuest);

orderRouter.get("/:id", requireAuth, orderController.getById);

orderRouter.post("/:id/cancel", requireAuth, orderController.cancel);
