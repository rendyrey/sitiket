import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Router } from "express";
import { getObject } from "../utils/storage.js";
import { badGateway, notFound } from "../utils/http-error.js";

/**
 * Public read path for every user upload. Objects live in a private R2 bucket,
 * so the API streams them back under the same `/uploads/<key>` URL the app has
 * always used — no stored URL, nginx route, or frontend origin has to change,
 * and the bucket never has to be made world-readable.
 */
export const uploadsRouter = Router();

/**
 * Object keys are freshly minted UUIDs and are never overwritten, so a cached
 * copy can never go stale — cache it for a year.
 */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * Reads the object key out of the request path. Keys carry a directory prefix
 * (`events/`, `merch/`, `proofs/tickets/`, `proofs/merch/`, `qris/`), and older
 * ones are flat, so this matches the whole remaining path rather than a single
 * segment.
 *
 * @param {string} requestPath - path within this router. Example: `"/merch/7f3c….jpg"`
 * @returns {string|null} the key, or null if the path could not be a valid key.
 *   Example: `"merch/7f3c….jpg"`
 */
const toObjectKey = (requestPath) => {
  const key = decodeURIComponent(requestPath).replace(/^\/+/, "");
  // Reject empty keys and any `..` segment. R2 keys are opaque strings so this
  // cannot escape the bucket, but a traversal-looking path is never legitimate
  // here and normalising clients could resolve it to an unintended object.
  if (!key || key.split("/").includes("..")) return null;
  return key;
};

uploadsRouter.get("/*splat", async (request, response, next) => {
  try {
    const key = toObjectKey(request.path);
    if (!key) throw notFound("FILE_NOT_FOUND", "File not found");

    // Forward the browser's validator so a repeat view costs a 304 with no
    // body instead of re-streaming the whole image through this host.
    const ifNoneMatch = request.headers["if-none-match"];
    const upstream = await getObject(key, ifNoneMatch ? { "if-none-match": ifNoneMatch } : {});

    if (upstream.status === 304) {
      response.status(304).end();
      return;
    }
    if (upstream.status === 404) throw notFound("FILE_NOT_FOUND", "File not found");
    if (!upstream.ok) {
      console.error(`R2 GET ${key} failed: ${upstream.status} ${await upstream.text()}`);
      throw badGateway("STORAGE_UNAVAILABLE", "Could not load that file. Please try again.");
    }

    const etag = upstream.headers.get("etag");
    const contentLength = upstream.headers.get("content-length");
    response.set({
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": CACHE_CONTROL,
      ...(etag ? { ETag: etag } : {}),
      ...(contentLength ? { "Content-Length": contentLength } : {}),
    });

    await pipeline(Readable.fromWeb(upstream.body), response);
  } catch (error) {
    // A viewer who navigates away mid-download tears down the socket, which
    // surfaces here as a stream error. Nothing is wrong on the server and
    // there is nobody left to answer, so drop it instead of logging a 500.
    if (request.destroyed || response.destroyed) return;
    next(error);
  }
});
