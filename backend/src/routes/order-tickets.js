import { Router } from "express";
import * as ticketController from "../controllers/ticket-controller.js";
import { requireAuth } from "../middleware/auth.js";

// mergeParams so `:orderId` from the parent mount (see app.js) is visible here.
export const orderTicketRouter = Router({ mergeParams: true });

orderTicketRouter.get("/", requireAuth, ticketController.listForOrder);
