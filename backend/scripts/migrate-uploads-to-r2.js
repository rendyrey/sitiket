/**
 * One-off backfill: copies every file already sitting in the legacy local
 * upload directory (`UPLOAD_DIR`) into the R2 bucket under the same key.
 *
 * Keys are preserved, so the `/uploads/<key>` URLs already stored in the
 * database keep resolving — no data migration is needed, only this copy.
 * Safe to re-run: an existing object is simply overwritten with the same bytes.
 *
 * Usage (on whichever host holds the files — the VPS, for production):
 *   npm run uploads:migrate
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../src/config/env.js";
import { putObject } from "../src/utils/storage.js";

/** Extension → MIME type, so R2 serves each object back with the right header. */
const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const entries = await readdir(env.UPLOAD_DIR, { withFileTypes: true }).catch((error) => {
  if (error.code === "ENOENT") return [];
  throw error;
});

const files = entries.filter((entry) => entry.isFile() && !entry.name.startsWith("."));
console.log(`Found ${files.length} file(s) in ${env.UPLOAD_DIR} -> r2://${env.R2_BUCKET}`);

let copied = 0;
for (const file of files) {
  const body = await readFile(path.join(env.UPLOAD_DIR, file.name));
  const contentType = CONTENT_TYPES[path.extname(file.name).toLowerCase()] ?? "application/octet-stream";
  await putObject(file.name, body, contentType);
  copied += 1;
  console.log(`  [${copied}/${files.length}] ${file.name} (${body.length} bytes, ${contentType})`);
}

console.log(`Done. ${copied} file(s) now in R2. Verify a few images load, then the local directory can be archived.`);
