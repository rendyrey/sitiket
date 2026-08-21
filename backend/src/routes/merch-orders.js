import { Router } from "express";
import * as merchOrderController from "../controllers/merch-order-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { createMerchOrderSchema, listSellingOrdersQuerySchema } from "../schemas/merch-order-schemas.js";

/** Merch checkout + order reads. Everything requires a session — merch has no guest flow. */
export const merchOrderRouter = Router();

merchOrderRouter.use(requireAuth);

merchOrderRouter.post("/", writeLimiter, validate(createMerchOrderSchema), merchOrderController.create);
merchOrderRouter.get("/mine", merchOrderController.listMine);
merchOrderRouter.get(
  "/selling",
  requireRole("admin", "super_admin"),
  validate(listSellingOrdersQuerySchema, "query"),
  merchOrderController.listSelling,
);
merchOrderRouter.get("/:id", merchOrderController.getById);
merchOrderRouter.post("/:id/cancel", merchOrderController.cancel);
