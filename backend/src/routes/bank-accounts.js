import { Router } from "express";
import * as bankAccountController from "../controllers/bank-account-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createBankAccountSchema, updateBankAccountSchema } from "../schemas/bank-account-schemas.js";

export const bankAccountRouter = Router();

bankAccountRouter.use(requireAuth, requireRole("admin", "super_admin"));

bankAccountRouter.get("/", bankAccountController.list);
bankAccountRouter.post("/", validate(createBankAccountSchema), bankAccountController.create);
bankAccountRouter.patch("/:id", validate(updateBankAccountSchema), bankAccountController.update);
