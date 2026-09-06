import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import sharp from "sharp";
import { compressImage, __testables } from "./compress-image.js";

const { POLICIES } = __testables;

/** A 1080x1350 Instagram-portrait poster — one of the exact allowed sizes. */
const poster = () =>
  sharp({ create: { width: 1080, height: 1350, channels: 3, background: "#c33" } })
    .png()
    .toBuffer();

/** A hard-edged black-and-white pattern, standing in for a QR code. */
const qrLike = () =>
  sharp({ create: { width: 400, height: 400, channels: 3, background: "#fff" } })
    .composite([
      { input: { create: { width: 120, height: 120, channels: 3, background: "#000" } }, top: 20, left: 20 },
      { input: { create: { width: 120, height: 120, channels: 3, background: "#000" } }, top: 260, left: 260 },
    ])
    .png()
    .toBuffer();

test("never resizes an event poster — the exact-resolution rule depends on it", async () => {
  const { width, height } = await compressImage(await poster(), "events");
  assert.equal(width, 1080);
  assert.equal(height, 1350);
});

test("stores a QRIS code pixel-for-pixel so it stays scannable", async () => {
  const original = await qrLike();
  const { buffer, width, height } = await compressImage(original, "qris");
  assert.equal(width, 400, "a QR code must not be resized");
  assert.equal(height, 400);

  // Lossless means the decoded pixels are identical, which is the actual
  // guarantee a payment app depends on — not merely "high quality".
  // Alpha is dropped first: a QR code is opaque, and sharp discards a
  // uniformly-opaque alpha channel on encode, which changes the channel count
  // without changing a single visible pixel.
  const before = await sharp(original).removeAlpha().raw().toBuffer();
  const after = await sharp(buffer).removeAlpha().raw().toBuffer();
  assert.ok(after.equals(before), "lossless re-encode must preserve every pixel");
});

test("downscales a large photo to its policy's longest edge", async () => {
  const photo = await sharp({ create: { width: 4032, height: 3024, channels: 3, background: "#468" } })
    .jpeg()
    .toBuffer();
  const { width, height } = await compressImage(photo, "proofs/merch");
  assert.equal(width, 1280, "longest edge is capped");
  assert.equal(height, 960, "aspect ratio is preserved");
});

test("does not enlarge an image smaller than the cap", async () => {
  const small = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#fff" } })
    .jpeg()
    .toBuffer();
  const { width, height } = await compressImage(small, "proofs/merch");
  assert.equal(width, 300);
  assert.equal(height, 200);
});

test("applies EXIF orientation to the pixels, since re-encoding drops the tag", async () => {
  // orientation 6 = rotate 90deg clockwise on display, so 100x200 becomes 200x100.
  const sideways = await sharp({ create: { width: 100, height: 200, channels: 3, background: "#fff" } })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const { width, height } = await compressImage(sideways, "proofs/tickets");
  assert.equal(width, 200, "rotated dimensions");
  assert.equal(height, 100);
});

test("salvages a truncated upload instead of rejecting it", async () => {
  const full = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#7a3" } })
    .jpeg()
    .toBuffer();
  const truncated = full.subarray(0, Math.floor(full.length * 0.6));
  const { width } = await compressImage(truncated, "proofs/merch");
  assert.equal(width, 800, "a clipped JPEG still yields an image");
});

test("rejects bytes that are not an image at all", async () => {
  await assert.rejects(() => compressImage(Buffer.from("this is not an image"), "merch"));
});

test("every prefix used by a route has a policy", () => {
  for (const prefix of ["events", "merch", "proofs/tickets", "proofs/merch", "qris"]) {
    assert.ok(prefix in POLICIES, `${prefix} needs an explicit policy`);
  }
  assert.equal(POLICIES.events.maxDimension, null, "posters are resolution-validated");
  assert.equal(POLICIES.qris.lossless, true, "QR codes must stay lossless");
});

test("never grows a lossless upload — keeps the original when WebP is larger", async () => {
  // Noise stands in for a real photo: lossless coding of it is far larger than
  // the lossy JPEG it came from, which is exactly the QRIS-from-JPEG case.
  const noise = randomBytes(600 * 800 * 3);
  const jpeg = await sharp(noise, { raw: { width: 600, height: 800, channels: 3 } })
    .jpeg({ quality: 70 })
    .toBuffer();

  const { buffer, mimeType } = await compressImage(jpeg, "qris");
  assert.ok(buffer.length <= jpeg.length, "storing more bytes for identical pixels is waste");
  assert.ok(buffer.equals(jpeg), "the original bytes are kept verbatim");
  assert.equal(mimeType, "image/jpeg", "and are labelled with their own format, not webp");
});
