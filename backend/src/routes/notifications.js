import { Router } from "express";
import * as notificationController from "../controllers/notification-controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { listNotificationsQuerySchema, markNotificationsReadSchema } from "../schemas/notification-schemas.js";

/** The header bell — always scoped to the signed-in caller's own rows. */
export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get("/", validate(listNotificationsQuerySchema, "query"), notificationController.list);
notificationRouter.get("/unread-count", notificationController.unreadCount);
notificationRouter.post("/read", validate(markNotificationsReadSchema), notificationController.markRead);
