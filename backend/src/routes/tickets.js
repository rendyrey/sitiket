import { Router } from "express";
import * as ticketController from "../controllers/ticket-controller.js";
import { requireAuth } from "../middleware/auth.js";

export const ticketRouter = Router();

ticketRouter.get("/mine", requireAuth, ticketController.listMine);
