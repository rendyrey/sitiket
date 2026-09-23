import { Router } from "express";
import * as chatController from "../controllers/chat-controller.js";
import { optionalAuth } from "../middleware/auth.js";
import { chatLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { chatMessageSchema } from "../schemas/chat-schemas.js";

export const chatRouter = Router();

chatRouter.post("/messages", chatLimiter, optionalAuth, validate(chatMessageSchema), chatController.sendMessage);
