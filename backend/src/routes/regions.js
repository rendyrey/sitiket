import { Router } from "express";
import * as regionController from "../controllers/region-controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  districtCodeParamsSchema,
  provinceCodeParamsSchema,
  regencyCodeParamsSchema,
} from "../schemas/shipping-schemas.js";

/**
 * Indonesian region lists for the address pickers. Signed-in only — each
 * cache miss spends a credit-limited vendor call, so the lists are not
 * exposed anonymously.
 */
export const regionRouter = Router();

regionRouter.use(requireAuth);

regionRouter.get("/provinces", regionController.listProvinces);
regionRouter.get("/provinces/:code/regencies", validate(provinceCodeParamsSchema, "params"), regionController.listRegencies);
regionRouter.get("/regencies/:code/districts", validate(regencyCodeParamsSchema, "params"), regionController.listDistricts);
regionRouter.get("/districts/:code/villages", validate(districtCodeParamsSchema, "params"), regionController.listVillages);
