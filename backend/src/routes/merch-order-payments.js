import { Router } from "express";
import * as merchOrderController from "../controllers/merch-order-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { decideMerchPaymentProofSchema } from "../schemas/merch-order-schemas.js";

export const merchOrderPaymentRouter = Router();

merchOrderPaymentRouter.use(requireAuth, requireRole("admin", "super_admin"));

merchOrderPaymentRouter.post("/:id/approve", validate(decideMerchPaymentProofSchema), merchOrderController.approvePayment);
merchOrderPaymentRouter.post("/:id/reject", validate(decideMerchPaymentProofSchema), merchOrderController.rejectPayment);
