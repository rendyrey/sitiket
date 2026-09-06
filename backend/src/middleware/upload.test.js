import assert from "node:assert/strict";
import test from "node:test";
import multer from "multer";
import { HttpError } from "../utils/http-error.js";
import { __testables } from "./upload.js";

const { toClientError, toObjectKey } = __testables;

test("maps a file-size overflow to a clear 400, not a generic 500", () => {
  const mapped = toClientError(new multer.MulterError("LIMIT_FILE_SIZE"));
  assert.ok(mapped instanceof HttpError, "should be an HttpError the error-handler renders as-is");
  assert.equal(mapped.statusCode, 400);
  assert.equal(mapped.code, "IMAGE_TOO_LARGE");
});

test("maps any other multer error to a 400 UPLOAD_FAILED", () => {
  const mapped = toClientError(new multer.MulterError("LIMIT_UNEXPECTED_FILE"));
  assert.ok(mapped instanceof HttpError);
  assert.equal(mapped.statusCode, 400);
  assert.equal(mapped.code, "UPLOAD_FAILED");
});

test("passes a fileFilter HttpError (wrong type) through untouched", () => {
  const original = new HttpError(400, "INVALID_IMAGE_TYPE", "not an image");
  assert.equal(toClientError(original), original);
});

test("passes an unknown error through untouched", () => {
  const original = new Error("boom");
  assert.equal(toClientError(original), original);
});

test("keys an object under its prefix with a random uuid", () => {
  const key = toObjectKey("proofs/merch", "image/jpeg");
  assert.match(key, /^proofs\/merch\/[0-9a-f-]{36}\.jpg$/, "should be <prefix>/<uuid>.<ext>");
  assert.notEqual(key, toObjectKey("proofs/merch", "image/jpeg"), "two uploads must not collide");
});

test("derives the extension from the mime type, not the client filename", () => {
  // A Windows browser hands back "photo.jfif" for a plain JPEG; the stored key
  // must still be .jpg so it is served as a renderable image.
  assert.match(toObjectKey("events", "image/jpeg"), /\.jpg$/);
  assert.match(toObjectKey("merch", "image/png"), /\.png$/);
  assert.match(toObjectKey("qris", "image/webp"), /\.webp$/);
});
