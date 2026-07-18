import { Router } from "express";
import * as orderController from "../controllers/order-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

// mergeParams so `:eventId` from the parent mount (see app.js) is visible here.
export const eventOrderRouter = Router({ mergeParams: true });

eventOrderRouter.get("/", requireAuth, requireRole("admin", "super_admin"), orderController.listForEvent);
