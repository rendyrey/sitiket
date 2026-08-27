import { Router } from "express";
import * as qrisConfigController from "../controllers/qris-config-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { singleImageUpload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { saveQrisConfigSchema, updateQrisConfigSchema } from "../schemas/qris-config-schemas.js";

export const qrisConfigRouter = Router();

qrisConfigRouter.use(requireAuth, requireRole("admin", "super_admin"));

qrisConfigRouter.get("/", qrisConfigController.getMine);
qrisConfigRouter.put("/", singleImageUpload("qrisImage"), validate(saveQrisConfigSchema), qrisConfigController.save);
qrisConfigRouter.patch("/", validate(updateQrisConfigSchema), qrisConfigController.update);
qrisConfigRouter.delete("/", qrisConfigController.remove);
