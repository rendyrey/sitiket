import { Router } from "express";
import * as ticketController from "../controllers/ticket-controller.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { scanTicketSchema } from "../schemas/ticket-schemas.js";

export const checkInRouter = Router();

// No requireRole here — a gate-scanner account can be a plain "user" role
// delegated via event_staff; services/ticket-service.js `assertCanScanEvent`
// does the real authorization (owner, event_staff, or super_admin).
checkInRouter.post("/scan", requireAuth, writeLimiter, validate(scanTicketSchema), ticketController.scan);
