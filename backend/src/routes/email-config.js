import { Router } from "express";
import * as emailConfigController from "../controllers/email-config-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { saveEmailConfigSchema } from "../schemas/email-config-schemas.js";

export const emailConfigRouter = Router();

emailConfigRouter.use(requireAuth, requireRole("admin", "super_admin"));

emailConfigRouter.get("/", emailConfigController.getMine);
emailConfigRouter.put("/", validate(saveEmailConfigSchema), emailConfigController.save);
