import { Router } from "express";
import * as eventAttendanceController from "../controllers/event-attendance-controller.js";
import { requireAuth } from "../middleware/auth.js";

// mergeParams so `:eventId` from the parent mount (see app.js) is visible here.
export const eventAttendanceRouter = Router({ mergeParams: true });

// No requireRole — accepted gate staff can be plain "user" accounts. The
// service authorizes (owner, accepted event_staff, or super_admin) and
// withholds revenue from non-owners.
eventAttendanceRouter.get("/", requireAuth, eventAttendanceController.get);
