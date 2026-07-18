import { Router } from "express";
import * as eventImageController from "../controllers/event-image-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { uploadEventImageSchema } from "../schemas/event-image-schemas.js";

// mergeParams so `:eventId` from the parent mount (see app.js) is visible here.
export const eventImageRouter = Router({ mergeParams: true });

// Public — event galleries/posters are shown on the public event detail page.
eventImageRouter.get("/", eventImageController.list);

eventImageRouter.post(
  "/",
  requireAuth,
  requireRole("admin", "super_admin"),
  imageUpload.single("image"),
  validate(uploadEventImageSchema),
  eventImageController.upload,
);

eventImageRouter.delete("/:imageId", requireAuth, requireRole("admin", "super_admin"), eventImageController.remove);
