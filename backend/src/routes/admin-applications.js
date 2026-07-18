import { Router } from "express";
import * as adminApplicationController from "../controllers/admin-application-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  applyAdminSchema,
  decideAdminApplicationSchema,
  listAdminApplicationsQuerySchema,
} from "../schemas/admin-application-schemas.js";

export const adminApplicationRouter = Router();

adminApplicationRouter.post("/", requireAuth, validate(applyAdminSchema), adminApplicationController.apply);

adminApplicationRouter.get(
  "/",
  requireAuth,
  requireRole("super_admin"),
  validate(listAdminApplicationsQuerySchema, "query"),
  adminApplicationController.list,
);

adminApplicationRouter.post(
  "/:id/approve",
  requireAuth,
  requireRole("super_admin"),
  validate(decideAdminApplicationSchema),
  adminApplicationController.approve,
);

adminApplicationRouter.post(
  "/:id/reject",
  requireAuth,
  requireRole("super_admin"),
  validate(decideAdminApplicationSchema),
  adminApplicationController.reject,
);
