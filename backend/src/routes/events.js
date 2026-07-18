import { Router } from "express";
import * as eventController from "../controllers/event-controller.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  changeEventStatusSchema,
  createEventSchema,
  listEventsQuerySchema,
  setEventVisibilitySchema,
  updateEventSchema,
} from "../schemas/event-schemas.js";

export const eventRouter = Router();

eventRouter.get("/", validate(listEventsQuerySchema, "query"), eventController.listPublic);

eventRouter.get(
  "/mine",
  requireAuth,
  requireRole("admin", "super_admin"),
  validate(listEventsQuerySchema, "query"),
  eventController.listMine,
);

eventRouter.post("/", requireAuth, requireRole("admin", "super_admin"), validate(createEventSchema), eventController.create);

// Must come after the more specific routes above — `:slug` would otherwise swallow them.
eventRouter.get("/:slug", optionalAuth, eventController.getBySlug);

eventRouter.patch(
  "/:id",
  requireAuth,
  requireRole("admin", "super_admin"),
  validate(updateEventSchema),
  eventController.update,
);

eventRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("admin", "super_admin"),
  validate(changeEventStatusSchema),
  eventController.changeStatus,
);

eventRouter.patch(
  "/:id/visibility",
  requireAuth,
  requireRole("admin", "super_admin"),
  validate(setEventVisibilitySchema),
  eventController.setVisibility,
);
