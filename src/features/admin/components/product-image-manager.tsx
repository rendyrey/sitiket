"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { removeProductImageAction, uploadProductImageAction } from "@/features/admin/lib/actions";
import type { ProductImage } from "@/lib/api/types";
import { normalizeImageForUpload, toUploadErrorMessage } from "@/lib/image/normalize-image";
import { toAssetUrl } from "@/lib/public-env";

const MAX_IMAGES = 10;

/**
 * Product photo gallery manager — up to 10 photos (the Shopee/Tokopedia
 * slider size), first photo doubles as the catalog thumbnail.
 */
export default function ProductImageManager({ images, productId }: { images: ProductImage[]; productId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose an image file first.");
      return;
    }

    setSubmitting(true);
    // try/finally: a throw (decode failure, over-limit body) must never pin
    // the button on "Uploading…" with no way to retry.
    try {
      const formData = new FormData();
      formData.append("image", await normalizeImageForUpload(file));

      const result = await uploadProductImageAction(productId, formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (cause) {
      setError(toUploadErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (imageId: string) => {
    await removeProductImageAction(productId, imageId);
    router.refresh();
  };

  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="tag">Photos</span>
        <span className="text-xs font-bold uppercase tracking-widest text-black/40">
          {images.length}/{MAX_IMAGES}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5">
        {images.map((image, index) => (
          <div key={image.id} className="border-2 border-ink p-2">
            <div className="relative aspect-square overflow-hidden bg-paper">
              <Image src={toAssetUrl(image.imageUrl)} alt="" fill sizes="160px" className="object-cover" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-black/40">
                {index === 0 ? "Cover" : `#${index + 1}`}
              </span>
              <button type="button" onClick={() => void handleRemove(image.id)} className="text-[10px] font-black uppercase text-red-600 hover:underline">
                Remove
              </button>
            </div>
          </div>
        ))}
        {images.length === 0 && (
          <p className="col-span-full text-sm text-black/50">No photos yet — the first upload becomes the catalog thumbnail.</p>
        )}
      </div>
      {images.length < MAX_IMAGES && (
        <div className="mt-5 flex flex-col gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center">
          <input ref={fileInputRef} type="file" accept="image/*" className="text-field h-auto flex-1 py-3" />
          <button type="button" onClick={() => void handleUpload()} disabled={submitting} className="button button-dark disabled:opacity-50">
            {submitting ? "Uploading…" : "Upload photo"}
          </button>
        </div>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
