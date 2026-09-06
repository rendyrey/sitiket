import sharp from "sharp";

/**
 * Per-prefix compression policy. Uploads differ in what may safely be changed,
 * so each entry states the constraint it is respecting rather than applying one
 * blanket setting:
 *
 * - `events` — event posters are validated against **exact** pixel resolutions
 *   (services/event-image-service.js `POSTER_RESOLUTIONS`), so resizing one
 *   would silently make an out-of-spec artwork pass. Re-encode only.
 * - `qris` — a QRIS code has to stay scannable by a payment app, so it is
 *   stored lossless and at full size. Never trade quality here for bytes.
 * - `merch` / `proofs/*` — ordinary photos, usually straight off a phone
 *   camera at 3-5 MB. These are the bulk of the bucket and take the full
 *   treatment: downscale to fit `maxDimension`, then lossy re-encode. Proofs
 *   go slightly harder than product photos: a proof is glanced at once by an
 *   admin verifying a transfer, whereas a product photo is customer-facing.
 *
 * Numbers measured against all 262 production images: `1280`/`75` put 94% of
 * them under 120 KB and cut the bucket from 151 MB to 14 MB. Going lower
 * (1100 px, q70) bought only ~3% more for a real risk of a bank receipt's
 * transfer details becoming unreadable, which is the one thing a proof exists
 * to show — so 1280 is the floor.
 *
 * @type {Record<string, { maxDimension: number|null, quality?: number, lossless?: boolean }>}
 */
const POLICIES = {
  events: { maxDimension: null, quality: 82 },
  merch: { maxDimension: 1280, quality: 78 },
  "proofs/tickets": { maxDimension: 1280, quality: 75 },
  "proofs/merch": { maxDimension: 1280, quality: 75 },
  qris: { maxDimension: null, lossless: true },
};

/** sharp's format name → the MIME type to store an untouched original under. */
const MIME_TYPE_BY_FORMAT = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Applied to any prefix without its own entry — conservative: no resize. */
const DEFAULT_POLICY = { maxDimension: null, quality: 82 };

/**
 * Re-encodes one uploaded image to WebP, downscaling it first when its policy
 * allows. WebP is used for every output because it beats both JPEG and PNG at
 * equivalent quality and is supported by every browser the app targets.
 *
 * EXIF orientation is applied to the pixels (`rotate()` with no argument)
 * before anything else: re-encoding strips metadata, so a phone photo taken
 * sideways would otherwise display rotated once its orientation tag is gone.
 *
 * @param {Buffer} buffer - the decoded upload as multer buffered it
 * @param {string} prefix - the upload's directory prefix, selecting the policy.
 *   Example: `"proofs/merch"`
 * @returns {Promise<{ buffer: Buffer, mimeType: string, width: number, height: number }>}
 *   the bytes to store plus the final dimensions — callers need these for the
 *   poster-resolution check and the `event_images` row, and reading them here
 *   avoids decoding the image a second time.
 * @throws {Error} if the bytes are not a decodable image; the caller maps this
 *   to a 400 (the declared MIME type is client-supplied and can lie).
 */
export const compressImage = async (buffer, prefix) => {
  const policy = POLICIES[prefix] ?? DEFAULT_POLICY;

  // `failOn: "none"` tolerates truncated/slightly-malformed input and encodes
  // whatever decoded. Mobile uploads over a flaky connection routinely arrive
  // with a clipped tail (production already holds such a JPEG) — a browser
  // renders those fine, so rejecting them would be a regression. Input with no
  // decodable image data at all still throws, and the caller maps that to 400.
  let pipeline = sharp(buffer, { failOn: "none" }).rotate();

  if (policy.maxDimension) {
    // `fit: "inside"` preserves the aspect ratio; `withoutEnlargement` stops a
    // small image from being upscaled into a bigger file than it started as.
    pipeline = pipeline.resize({
      width: policy.maxDimension,
      height: policy.maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const { data, info } = await pipeline
    .webp(policy.lossless ? { lossless: true } : { quality: policy.quality })
    .toBuffer({ resolveWithObject: true });

  // A lossless re-encode of already-lossy input is routinely *larger* than the
  // original — a JPEG QRIS code roughly doubles. Storing more bytes for
  // identical pixels is pure waste, so keep whichever is smaller. The original
  // is equally safe: its pixels are by definition unchanged, and browsers apply
  // a JPEG's own EXIF orientation, which is exactly how these files were served
  // before R2. Only the lossless path can grow like this; a lossy re-encode of
  // a photo always shrinks.
  if (policy.lossless && buffer.length < data.length) {
    const sourceMimeType = MIME_TYPE_BY_FORMAT[(await sharp(buffer).metadata()).format];
    if (sourceMimeType) {
      return { buffer, mimeType: sourceMimeType, width: info.width, height: info.height };
    }
  }

  return { buffer: data, mimeType: "image/webp", width: info.width, height: info.height };
};


// Exported so the policy table can be asserted against the poster/QRIS rules.
export const __testables = { POLICIES, DEFAULT_POLICY };
