/**
 * Backfill / recompress: copies every file in the legacy local upload directory
 * (`UPLOAD_DIR`) into the R2 bucket, compressed, **under the same key**.
 *
 * Keys are preserved, so the `/uploads/<key>` URLs already stored in the
 * database keep resolving — no data migration is needed, only this copy. The
 * key keeps its original extension while the bytes become WebP; that is
 * harmless because the read proxy serves the `Content-Type` recorded on the
 * object, and nothing in the app infers a type from the key.
 *
 * Nothing is resized. A flat key carries no hint of what the image is for, and
 * `event_images` rows store each poster's width/height, so changing dimensions
 * here would make those rows wrong and could let out-of-spec artwork pass the
 * poster-resolution rule. QRIS codes are looked up in the database and stored
 * lossless, because a QR code has to stay scannable by a payment app.
 *
 * Safe to re-run: each object is simply overwritten from the same source file,
 * which is also how a wrong `Content-Type` or a missed compression is fixed.
 *
 * Usage (on whichever host holds the files — the VPS, for production):
 *   npm run uploads:migrate
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { compressImage } from "../src/utils/compress-image.js";
import { putObject } from "../src/utils/storage.js";

/** Formats a byte count for the progress log. Example: `1536` -> `"1.5 MB"`. */
const megabytes = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

/**
 * Object keys that are QRIS codes, read from `qris_configs.qris_image_url`
 * (stored as `/uploads/<key>`). These take the lossless policy so the QR stays
 * pixel-exact and therefore scannable.
 */
const qrisKeys = new Set(
  (await db("qris_configs").select("qris_image_url"))
    .map((row) => row.qris_image_url?.replace(/^\/uploads\//, ""))
    .filter(Boolean),
);

const entries = await readdir(env.UPLOAD_DIR, { withFileTypes: true }).catch((error) => {
  if (error.code === "ENOENT") return [];
  throw error;
});

const files = entries.filter((entry) => entry.isFile() && !entry.name.startsWith("."));
console.log(`Found ${files.length} file(s) in ${env.UPLOAD_DIR} -> r2://${env.R2_BUCKET}`);
console.log(`${qrisKeys.size} of them are QRIS codes and will be stored lossless.`);

let done = 0;
let failed = 0;
let sourceBytes = 0;
let storedBytes = 0;

for (const file of files) {
  const original = await readFile(path.join(env.UPLOAD_DIR, file.name));
  sourceBytes += original.length;

  let compressed;
  try {
    compressed = await compressImage(original, qrisKeys.has(file.name) ? "qris" : "legacy");
  } catch (error) {
    // Undecodable source: leave whatever is already in R2 alone rather than
    // replacing a working object with nothing.
    console.warn(`  FAILED ${file.name} — ${error.message}`);
    failed += 1;
    continue;
  }

  await putObject(file.name, compressed.buffer, compressed.mimeType);
  storedBytes += compressed.buffer.length;
  done += 1;
  const saved = (100 - (compressed.buffer.length / original.length) * 100).toFixed(0);
  console.log(
    `  [${done}/${files.length}] ${file.name} ${(original.length / 1024).toFixed(0)}KB -> ${(compressed.buffer.length / 1024).toFixed(0)}KB (-${saved}%) ${compressed.width}x${compressed.height}`,
  );
}

console.log(
  `\nDone. ${done} object(s) written${failed ? `, ${failed} failed` : ""}: ${megabytes(sourceBytes)} -> ${megabytes(storedBytes)}.`,
);
await db.destroy();
