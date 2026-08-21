import { Router } from "express";
import * as productController from "../controllers/product-controller.js";
import { validate } from "../middleware/validate.js";
import { listCatalogQuerySchema } from "../schemas/product-schemas.js";

/** Public storefront reads — no auth, everyone can browse and search merch. */
export const merchRouter = Router();

merchRouter.get("/", validate(listCatalogQuerySchema, "query"), productController.listCatalog);
merchRouter.get("/:slug", productController.getBySlug);
