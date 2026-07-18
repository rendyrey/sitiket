import { Router } from "express";
import * as ticketTypeController from "../controllers/ticket-type-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createTicketTypeSchema, updateTicketTypeSchema } from "../schemas/ticket-type-schemas.js";

// mergeParams so `:eventId` from the parent mount (see app.js) is visible here.
export const ticketTypeRouter = Router({ mergeParams: true });

ticketTypeRouter.get("/", ticketTypeController.listPublic);

ticketTypeRouter.get(
  "/mine",
  requireAuth,
  requireRole("admin", "super_admin"),
  ticketTypeController.listMine,
);

ticketTypeRouter.post(
  "/",
  requireAuth,
  requireRole("admin", "super_admin"),
  validate(createTicketTypeSchema),
  ticketTypeController.create,
);

ticketTypeRouter.patch(
  "/:ticketTypeId",
  requireAuth,
  requireRole("admin", "super_admin"),
  validate(updateTicketTypeSchema),
  ticketTypeController.update,
);
