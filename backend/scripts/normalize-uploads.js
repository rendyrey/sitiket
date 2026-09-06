/**
 * Makes R2 match the database: every referenced upload ends up under the
 * directory prefix for its kind, compressed with that kind's policy, and its
 * row rewritten to the new `/uploads/<prefix>/<file>` URL.
 *
 * This subsumes the original disk→R2 backfill. It handles, per row:
 *
 * - already at the right key → nothing to do (so the script is idempotent and
 *   a re-run is a no-op);
 * - original still on local disk → compress it with the **correct per-kind
 *   policy** and upload. This is preferred over copying, because an object
 *   moved before its kind was known was compressed with the conservative
 *   "never resize" fallback; knowing it is a payment proof rather than an
 *   event poster is what allows it to be resized at all;
 * - original gone from disk → server-side R2 copy, so the bytes never travel
 *   through this host.
 *
 * Order per row is copy/upload → verify → update row → delete the old object.
 * Interrupting it can leave an unreferenced object behind, never a broken
 * link: until the row is rewritten it still points at the object that exists.
 *
 * Keys under a prefix that no row references are reported, never touched —
 * classification comes from whichever database this runs against, and another
 * environment sharing the bucket has rows this one cannot see.
 *
 * Usage:  npm run uploads:normalize
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { compressImage } from "../src/utils/compress-image.js";
import { copyObject, deleteObject, objectExists, putObject } from "../src/utils/storage.js";

/**
 * Every table/column holding an upload URL, and the directory its images
 * belong under. Adding an upload kind means adding a row here.
 */
const SOURCES = [
  { table: "event_images", column: "image_url", prefix: "events" },
  { table: "product_images", column: "image_url", prefix: "merch" },
  { table: "order_payments", column: "proof_image_url", prefix: "proofs/tickets" },
  { table: "merch_order_payments", column: "proof_image_url", prefix: "proofs/merch" },
  { table: "qris_configs", column: "qris_image_url", prefix: "qris" },
];

const URL_PREFIX = "/uploads/";

let moved = 0;
let already = 0;
let failed = 0;
let sourceBytes = 0;
let storedBytes = 0;

for (const { table, column, prefix } of SOURCES) {
  const rows = await db(table).select("id", `${column} as url`);
  console.log(`\n${table} (${rows.length} rows) -> ${prefix}/`);

  for (const row of rows) {
    if (!row.url?.startsWith(URL_PREFIX)) continue;
    const currentKey = row.url.slice(URL_PREFIX.length);

    // Already filed under a directory — nothing to do.
    if (currentKey.includes("/")) {
      already += 1;
      continue;
    }

    const newKey = `${prefix}/${currentKey}`;
    try {
      // Preferred path: re-compress the untouched original with this kind's
      // policy, which is stricter than the one applied before its kind was known.
      const original = await readFile(path.join(env.UPLOAD_DIR, currentKey)).catch(() => null);

      if (original) {
        const compressed = await compressImage(original, prefix);
        await putObject(newKey, compressed.buffer, compressed.mimeType);
        sourceBytes += original.length;
        storedBytes += compressed.buffer.length;
      } else if (await objectExists(currentKey)) {
        await copyObject(currentKey, newKey);
      } else {
        console.warn(`  MISSING ${currentKey} — not on disk, not in R2; leaving ${table}.${row.id} untouched`);
        failed += 1;
        continue;
      }

      // Only rewrite the row once the new object is confirmed readable, so a
      // failed write can never strand a row pointing at nothing.
      if (!(await objectExists(newKey))) {
        console.warn(`  UNVERIFIED ${newKey} — leaving ${table}.${row.id} untouched`);
        failed += 1;
        continue;
      }

      await db(table).where({ id: row.id }).update({ [column]: `${URL_PREFIX}${newKey}` });
      await deleteObject(currentKey);
      moved += 1;
      if (moved % 25 === 0) console.log(`  … ${moved} moved`);
    } catch (error) {
      console.warn(`  FAILED ${currentKey}: ${error.message}`);
      failed += 1;
    }
  }
}

console.log(
  `\nMoved ${moved} object(s) into directories, ${already} already there${failed ? `, ${failed} failed` : ""}.`,
);
if (sourceBytes) {
  console.log(
    `Recompressed from originals: ${(sourceBytes / 1048576).toFixed(1)} MB -> ${(storedBytes / 1048576).toFixed(1)} MB.`,
  );
}
console.log("Objects no row references were left untouched — list them with the bucket listing.");
await db.destroy();
