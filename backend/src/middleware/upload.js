import { randomUUID } from "node:crypto";
import multer from "multer";
import { compressImage } from "../utils/compress-image.js";
import { putObject } from "../utils/storage.js";
import { badRequest } from "../utils/http-error.js";

/**
 * Accepted upload types mapped to the canonical file extension used in the
 * object key. The extension is derived from the (validated) MIME type rather
 * than the client's filename on purpose: browsers on Windows hand back `.jfif`
 * for an ordinary JPEG, and older uploads landed with `.JPG`, no extension at
 * all, or an extension that disagreed with the bytes. Keying off the MIME type
 * keeps every stored object named consistently and served with the right
 * `Content-Type`.
 */
const EXTENSION_BY_MIME_TYPE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
// Must stay in sync with the two limits in front of it, or an upload dies at
// the smallest link with a confusing error: nginx `client_max_body_size`
// (/etc/nginx/sites-available/sitiket) and the Next.js Server Action
// `bodySizeLimit` (next.config.js). All three are 50 MB.
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

/**
 * Builds the R2 object key for one upload: a directory prefix naming what the
 * image is for, then a random UUID (unguessable and collision-free) with the
 * canonical extension for its MIME type.
 *
 * @param {string} prefix - directory the upload belongs in, no trailing slash.
 *   Example: `"proofs/merch"`
 * @param {string} mimeType - the MIME type already vetted by the file filter.
 *   Example: `"image/jpeg"`
 * @returns {string} Example: `"proofs/merch/7f3c1e0a-….jpg"`
 */
const toObjectKey = (prefix, mimeType) => `${prefix}/${randomUUID()}${EXTENSION_BY_MIME_TYPE[mimeType]}`;

/**
 * Image upload buffered in memory, then handed to Cloudflare R2 by
 * {@link singleImageUpload}. Nothing is ever written to the API host's disk.
 *
 * ponytail: whole file buffered in RAM (capped at MAX_IMAGE_BYTES per request);
 * stream multipart straight into an R2 multipart upload if concurrency ever
 * makes that memory a problem.
 */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (request, file, callback) => {
    if (!(file.mimetype in EXTENSION_BY_MIME_TYPE)) {
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
      return badRequest("IMAGE_TOO_LARGE", "That photo is too large. Please upload an image under 50 MB.");
    }
    return badRequest("UPLOAD_FAILED", `Upload failed: ${error.message}`);
  }
  return error;
};

/**
 * Route middleware for a single-image multipart field: parses the field,
 * stores the image in R2 under `prefix/`, and reports every rejection (wrong
 * type, too large, storage failure) as a clear 4xx/502 instead of a silent 500.
 * Use this in place of `imageUpload.single(field)`.
 *
 * Downstream handlers read `request.file.filename` — the R2 object key,
 * prefix included — and `request.file.buffer`, exactly as they read the
 * multer-on-disk filename before, so they keep composing `/uploads/<key>` URLs
 * with no change.
 *
 * @param {string} fieldName - the multipart field name (e.g. "image", "proof")
 * @param {string} prefix - directory to store under, no trailing slash. One of
 *   `"events"`, `"merch"`, `"proofs/tickets"`, `"proofs/merch"`, `"qris"`.
 */
export const singleImageUpload = (fieldName, prefix) => (request, response, next) => {
  imageUpload.single(fieldName)(request, response, (error) => {
    if (error) {
      next(toClientError(error));
      return;
    }
    // The field is optional on some routes (e.g. QRIS config keeps its current
    // image when only the merchant name changes), so no file is not an error.
    if (!request.file) {
      next();
      return;
    }

    storeUpload(request, prefix).then(next, next);
  });
};

/**
 * Compresses the buffered upload, stores it in R2, and rewrites `request.file`
 * to describe what was actually stored (key, MIME type, bytes, dimensions) so
 * downstream services never see the pre-compression original.
 *
 * @param {import("express").Request} request - carries the multer `file`
 * @param {string} prefix - directory to store under. Example: `"merch"`
 */
const storeUpload = async (request, prefix) => {
  let compressed;
  try {
    compressed = await compressImage(request.file.buffer, prefix);
  } catch {
    // The MIME type is client-supplied, so bytes that pass the file filter can
    // still fail to decode (a truncated upload, or a renamed non-image).
    throw badRequest("INVALID_IMAGE", "That file could not be read as an image. Please try a different photo.");
  }

  const key = toObjectKey(prefix, compressed.mimeType);
  await putObject(key, compressed.buffer, compressed.mimeType);

  request.file.filename = key;
  request.file.buffer = compressed.buffer;
  request.file.size = compressed.buffer.length;
  request.file.mimetype = compressed.mimeType;
  // Measured during compression, so services needing the stored image's real
  // dimensions (the poster-resolution rule) don't have to decode it again.
  request.file.width = compressed.width;
  request.file.height = compressed.height;
};

// Exported for unit testing the multer-error → HttpError mapping and key naming.
export const __testables = { toClientError, toObjectKey, MAX_IMAGE_BYTES };
