import { Router } from "express";
import * as eventStaffController from "../controllers/event-staff-controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { respondStaffInvitationSchema } from "../schemas/event-staff-schemas.js";

// The invitee's side of gate staffing — any signed-in user can hold
// invitations (scanners are often plain "user" accounts), so no requireRole.
export const staffInvitationsRouter = Router();

staffInvitationsRouter.use(requireAuth);

staffInvitationsRouter.get("/", eventStaffController.listMine);
staffInvitationsRouter.post("/:staffId/respond", validate(respondStaffInvitationSchema), eventStaffController.respond);
