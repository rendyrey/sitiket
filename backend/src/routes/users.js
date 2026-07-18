import { Router } from "express";
import * as userController from "../controllers/user-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { listUsersQuerySchema, updateUserStatusSchema } from "../schemas/user-schemas.js";

export const userRouter = Router();

userRouter.use(requireAuth, requireRole("super_admin"));

userRouter.get("/", validate(listUsersQuerySchema, "query"), userController.list);
userRouter.patch("/:id/status", validate(updateUserStatusSchema), userController.updateStatus);
