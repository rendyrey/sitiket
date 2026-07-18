import { Router } from "express";
import * as orderPaymentController from "../controllers/order-payment-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { decidePaymentProofSchema } from "../schemas/order-payment-schemas.js";

export const orderPaymentRouter = Router();

orderPaymentRouter.use(requireAuth, requireRole("admin", "super_admin"));

orderPaymentRouter.post("/:id/approve", validate(decidePaymentProofSchema), orderPaymentController.approve);
orderPaymentRouter.post("/:id/reject", validate(decidePaymentProofSchema), orderPaymentController.reject);
