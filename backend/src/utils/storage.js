import { AwsClient } from "aws4fetch";
import { env } from "../config/env.js";
import { badGateway } from "./http-error.js";

/**
 * Signed S3-API client for the Cloudflare R2 bucket that holds every user
 * upload (event images, product photos, payment proofs, QRIS codes).
 * R2 ignores the region, but SigV4 requires one — "auto" is what Cloudflare
 * documents for the S3-compatible endpoint.
 */
const client = new AwsClient({
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});

/**
 * Absolute S3-API URL of one object. Each path segment is escaped separately so
 * a prefixed key keeps its `/` separators — `encodeURIComponent` on the whole
 * key would turn them into `%2F` and address a different (flat-named) object.
 *
 * @param {string} key - object key, i.e. prefix + stored filename.
 *   Example: `"proofs/merch/7f3c….jpg"`
 * @returns {string} Example: `"https://<account>.r2.cloudflarestorage.com/sitiket/proofs/merch/7f3c….jpg"`
 */
const objectUrl = (key) =>
  `${env.R2_ENDPOINT}/${env.R2_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;

/**
 * Stores one object in the bucket, overwriting any object with the same key.
 *
 * @param {string} key - object key to write. Example: `"7f3c….png"`
 * @param {Buffer} body - the file contents held in memory by multer
 * @param {string} contentType - MIME type served back on read. Example: `"image/png"`
 * @throws {HttpError} 502 when R2 rejects the write, so the caller sees a real
 *   failure instead of a stored row pointing at an object that never landed.
 */
export const putObject = async (key, body, contentType) => {
  const response = await client.fetch(objectUrl(key), {
    method: "PUT",
    body,
    headers: { "content-type": contentType },
  });

  if (!response.ok) {
    console.error(`R2 PUT ${key} failed: ${response.status} ${await response.text()}`);
    throw badGateway("UPLOAD_STORAGE_FAILED", "Could not store the uploaded file. Please try again.");
  }
};

/**
 * Fetches one object for the `/uploads/:key` read proxy.
 *
 * @param {string} key - object key to read. Example: `"7f3c….png"`
 * @param {Record<string, string>} [headers] - conditional-request headers to
 *   forward (e.g. `{ "if-none-match": '"abc"' }`) so R2 can answer 304.
 * @returns {Promise<Response>} the raw upstream response — status and body are
 *   the caller's to map.
 */
export const getObject = (key, headers = {}) => client.fetch(objectUrl(key), { headers });
