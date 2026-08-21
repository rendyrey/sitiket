import { Router } from "express";
import * as merchOrderController from "../controllers/merch-order-controller.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rate-limit.js";
import { singleImageUpload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { submitMerchPaymentProofSchema } from "../schemas/merch-order-schemas.js";

// mergeParams so `:orderId` from the parent mount (see app.js) is visible here.
export const merchOrderPaymentNestedRouter = Router({ mergeParams: true });

merchOrderPaymentNestedRouter.use(requireAuth);

merchOrderPaymentNestedRouter.get("/instructions", merchOrderController.getInstructions);
merchOrderPaymentNestedRouter.post(
  "/",
  writeLimiter,
  singleImageUpload("proof"),
  validate(submitMerchPaymentProofSchema),
  merchOrderController.submitPayment,
);
merchOrderPaymentNestedRouter.get("/", merchOrderController.listPayments);
