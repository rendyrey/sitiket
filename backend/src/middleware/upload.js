import { randomUUID } from "node:crypto";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
  destination: (request, file, callback) => callback(null, env.UPLOAD_DIR),
  filename: (request, file, callback) => callback(null, `${randomUUID()}${path.extname(file.originalname)}`),
});

/**
 * Local-disk image upload for development (event images, payment proofs).
 * Swap `storage` for a cloud-storage (e.g. GCS/S3) multer engine before
 * production — files currently live under `UPLOAD_DIR` on the API host.
 */
export const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (request, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Only JPEG, PNG, or WEBP images are allowed"));
      return;
    }
    callback(null, true);
  },
});
