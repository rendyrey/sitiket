import { Router } from "express";
import * as eventAttendanceController from "../controllers/event-attendance-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

// mergeParams so `:eventId` from the parent mount (see app.js) is visible here.
export const eventAttendanceRouter = Router({ mergeParams: true });

// Organizer-only: the service re-checks ownership (owner or super_admin) via
// `getOwnedEventOrThrow`, so an admin cannot read another organizer's numbers.
eventAttendanceRouter.get("/", requireAuth, requireRole("admin", "super_admin"), eventAttendanceController.get);
