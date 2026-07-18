import { Router } from "express";
import * as orderPaymentController from "../controllers/order-payment-controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rate-limit.js";
import { imageUpload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { getPaymentInstructionsQuerySchema, submitPaymentProofSchema } from "../schemas/order-payment-schemas.js";

// mergeParams so `:orderId` from the parent mount (see app.js) is visible here.
export const orderPaymentNestedRouter = Router({ mergeParams: true });

orderPaymentNestedRouter.get(
  "/instructions",
  optionalAuth,
  validate(getPaymentInstructionsQuerySchema, "query"),
  orderPaymentController.getInstructions,
);

orderPaymentNestedRouter.post(
  "/",
  writeLimiter,
  optionalAuth,
  imageUpload.single("proof"),
  validate(submitPaymentProofSchema),
  orderPaymentController.submit,
);

orderPaymentNestedRouter.get("/", requireAuth, orderPaymentController.list);
