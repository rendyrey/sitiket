import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";
import { badRequest } from "../utils/http-error.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// multer's diskStorage does not create its destination directory; if UPLOAD_DIR
// is missing every write fails with ENOENT and the upload 500s. Ensure it
// exists at startup. `recursive: true` is a no-op when it already exists.
// Example: UPLOAD_DIR="uploads" -> creates ./uploads relative to the process cwd.
mkdirSync(env.UPLOAD_DIR, { recursive: true });

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
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (request, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      // Pass an HttpError (not a bare Error) so the central error-handler turns
      // this into a 400 with a message the user can act on, rather than an
      // opaque 500. HEIC is called out because it's the iPhone camera default
      // and the single most common cause of a rejected upload.
      callback(
        badRequest(
          "INVALID_IMAGE_TYPE",
          "That photo must be a JPEG, PNG, or WEBP image. iPhone HEIC photos aren't supported directly — take a screenshot of it, or use a JPEG/PNG.",
        ),
      );
      return;
    }
    callback(null, true);
  },
});

/**
 * Maps multer's own errors (e.g. the file-size limit) to a client-safe 400.
 *
 * Without this, a `MulterError` — like `LIMIT_FILE_SIZE` when a photo exceeds
 * 10 MB — is not an {@link HttpError}, so `error-handler.js` reduces it to a
 * generic 500 "Something went wrong" and the user never learns the real reason.
 *
 * @param {unknown} error - the error multer handed to its callback
 * @returns {Error} the error to forward to `next()` — a 400 HttpError for known
 *   multer failures, otherwise the original error untouched.
 */
const toClientError = (error) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return badRequest("IMAGE_TOO_LARGE", "That photo is too large. Please upload an image under 10 MB.");
    }
    return badRequest("UPLOAD_FAILED", `Upload failed: ${error.message}`);
  }
  return error;
};

/**
 * Route middleware for a single-image multipart field that reports every
 * rejection (wrong type, too large) as a clear 400 instead of a silent 500.
 * Use this in place of `imageUpload.single(field)`.
 *
 * @param {string} fieldName - the multipart field name (e.g. "image", "proof")
 */
export const singleImageUpload = (fieldName) => (request, response, next) => {
  imageUpload.single(fieldName)(request, response, (error) => {
    if (error) {
      next(toClientError(error));
      return;
    }
    next();
  });
};

// Exported for unit testing the multer-error → HttpError mapping.
export const __testables = { toClientError, MAX_IMAGE_BYTES };
