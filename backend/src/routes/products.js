import { Router } from "express";
import * as productController from "../controllers/product-controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { singleImageUpload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  createProductSchema,
  replaceVariantsSchema,
  setProductActiveSchema,
  updateProductSchema,
} from "../schemas/product-schemas.js";

/** Seller-facing product management — every route needs an admin (or super_admin) session. */
export const productRouter = Router();

productRouter.use(requireAuth, requireRole("admin", "super_admin"));

productRouter.get("/mine", productController.listMine);
productRouter.post("/", validate(createProductSchema), productController.create);
productRouter.get("/:id", productController.getMine);
productRouter.patch("/:id", validate(updateProductSchema), productController.update);
productRouter.patch("/:id/status", validate(setProductActiveSchema), productController.setActive);
productRouter.delete("/:id", productController.remove);

productRouter.put("/:id/variants", validate(replaceVariantsSchema), productController.replaceVariants);

productRouter.post("/:id/images", singleImageUpload("image"), productController.addImage);
productRouter.delete("/:id/images/:imageId", productController.removeImage);
