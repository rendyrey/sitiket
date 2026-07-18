import { Router } from "express";
import * as refundRequestController from "../controllers/refund-request-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { decideRefundRequestSchema } from "../schemas/refund-request-schemas.js";

export const refundRequestRouter = Router();

refundRequestRouter.use(requireAuth, requireRole("admin", "super_admin"));

refundRequestRouter.get("/mine", refundRequestController.listMine);
refundRequestRouter.post("/:id/approve", validate(decideRefundRequestSchema), refundRequestController.approve);
refundRequestRouter.post("/:id/reject", validate(decideRefundRequestSchema), refundRequestController.reject);
refundRequestRouter.post("/:id/complete", validate(decideRefundRequestSchema), refundRequestController.complete);
