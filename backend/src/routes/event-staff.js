import { Router } from "express";
import * as eventStaffController from "../controllers/event-staff-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { inviteEventStaffSchema } from "../schemas/event-staff-schemas.js";

// mergeParams so `:eventId` from the parent mount (see app.js) is visible here.
export const eventStaffRouter = Router({ mergeParams: true });

eventStaffRouter.use(requireAuth, requireRole("admin", "super_admin"));

eventStaffRouter.get("/", eventStaffController.list);
eventStaffRouter.post("/", validate(inviteEventStaffSchema), eventStaffController.invite);
eventStaffRouter.delete("/:staffId", eventStaffController.remove);
