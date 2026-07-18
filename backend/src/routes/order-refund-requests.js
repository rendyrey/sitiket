import { Router } from "express";
import * as refundRequestController from "../controllers/refund-request-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { requestRefundSchema } from "../schemas/refund-request-schemas.js";

// mergeParams so `:orderId` from the parent mount (see app.js) is visible here.
export const orderRefundRequestRouter = Router({ mergeParams: true });

orderRefundRequestRouter.post("/", optionalAuth, validate(requestRefundSchema), refundRequestController.create);
orderRefundRequestRouter.get("/", requireAuth, refundRequestController.listForOrder);
