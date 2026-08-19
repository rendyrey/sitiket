/**
 * Client-side image normalization for uploads.
 *
 * Phone photos are the main source of failed uploads: iPhones save HEIC by
 * default (which the backend rejects), and modern camera JPEGs routinely exceed
 * the size cap. This decodes the picked file in the browser, scales it down to
 * a sane maximum edge, and re-encodes it as a JPEG the backend accepts — so a
 * HEIC or oversized photo "just works" instead of forcing the user to keep
 * swapping files until one happens to pass.
 *
 * It degrades safely: a file the browser can't decode (e.g. HEIC on a browser
 * without native HEIC support) is returned untouched, and the backend now
 * responds with a clear, specific error the user can act on.
 */

const BACKEND_SAFE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type NormalizeImageOptions = {
  /** Longest-edge cap in px. Larger images are scaled down; smaller ones are never scaled up. */
  maxEdge?: number;
  /** JPEG quality, 0–1. */
  quality?: number;
  /**
   * Files already in a backend-accepted format and at or below this size (bytes)
   * are passed through untouched, preserving their original bytes and quality.
   */
  passthroughMaxBytes?: number;
  /**
   * Never change the pixel dimensions — re-encode at the original width/height
   * instead of scaling to `maxEdge`. Required for event posters, which the
   * backend validates against an exact allow-list of resolutions (1080x1080,
   * 1080x1350, 1080x1920); silently downscaling one to fit `maxEdge` would turn
   * a valid poster into a confusing "wrong resolution" rejection.
   */
  preserveDimensions?: boolean;
};

type DecodedImage = {
  width: number;
  height: number;
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  release: () => void;
};

async function decodeImage(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap === "function") {
    // Prefer createImageBitmap: it decodes off the main thread and can honor
    // EXIF orientation, so portrait phone photos aren't drawn sideways.
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
        release: () => bitmap.close(),
      };
    } catch {
      // Older Safari rejects the options object — retry without it.
      try {
        const bitmap = await createImageBitmap(file);
        return {
          width: bitmap.width,
          height: bitmap.height,
          draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
          release: () => bitmap.close(),
        };
      } catch {
        // Fall through to the <img> path below.
      }
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Image decode failed"));
      element.src = objectUrl;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    URL.revokeObjectURL(objectUrl);
    return null;
  }
}

export async function normalizeImageForUpload(file: File, options: NormalizeImageOptions = {}): Promise<File> {
  const { maxEdge = 1920, quality = 0.85, passthroughMaxBytes = 8 * 1024 * 1024, preserveDimensions = false } = options;

  // Already a format the backend accepts and comfortably small — keep the
  // original bytes rather than re-encoding (avoids needless quality loss).
  if (BACKEND_SAFE_TYPES.has(file.type) && file.size <= passthroughMaxBytes) return file;

  // Not a browser environment (e.g. SSR) — nothing we can do; let it pass through.
  if (typeof document === "undefined") return file;

  const decoded = await decodeImage(file);
  if (!decoded || decoded.width === 0 || decoded.height === 0) return file;

  try {
    const scale = preserveDimensions ? 1 : Math.min(1, maxEdge / Math.max(decoded.width, decoded.height));
    const width = Math.round(decoded.width * scale);
    const height = Math.round(decoded.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    decoded.draw(context, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^./\\]+$/, "") || "upload";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    decoded.release();
  }
}

/**
 * Turns anything thrown during an upload into a sentence the uploader can act
 * on. Server Actions serialize errors lossily — an over-limit multipart body
 * surfaces client-side as an opaque "Failed to fetch"/"Body exceeded" string
 * rather than a typed error — so match on the message text and translate the
 * two failures that actually happen in the field.
 */
export function toUploadErrorMessage(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : String(cause ?? "");

  if (/body exceeded|content length|too large|413|payload/i.test(raw)) {
    return "That image is too large to upload. Please use an image under 50 MB.";
  }
  if (/fetch|network|load failed|connection/i.test(raw)) {
    return "Upload failed — the connection dropped. Check your network and try again.";
  }
  return "Upload failed. Please try again, or pick a different image file.";
}
