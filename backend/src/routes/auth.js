import { Router } from "express";
import * as authController from "../controllers/auth-controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { googleLoginSchema } from "../schemas/auth-schemas.js";

export const authRouter = Router();

authRouter.post("/google", authLimiter, validate(googleLoginSchema), authController.googleLogin);
authRouter.get("/me", requireAuth, authController.me);
